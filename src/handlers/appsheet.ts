import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { isAbsolute } from "node:path";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { RequestLogger } from "evlog";
import type { EvlogVariables } from "evlog/hono";
import { z } from "zod";
import {
  EmailNotificationStore,
  notificationIdentity,
  RETRY_WINDOW_MS,
} from "../email-notifications.js";
import { postToRoom } from "../campfire.js";
import { escapeHtml } from "../review-bots.js";
import {
  MAINTENANCE_SUBJECT,
  maintenanceEmailText,
  renderMaintenanceEmail,
} from "../emails/maintenance-request.js";
import { sendResendEmail } from "../resend.js";

const Identifier = z.string().min(1).max(200);
const Payload = z.strictObject({
  appId: Identifier,
  email: z.email().max(254),
  event: z.literal("record.created"),
  name: z.string().max(200),
  recordId: Identifier,
  table: Identifier,
});
const Config = z.object({
  APPSHEET_APP_ID: Identifier,
  APPSHEET_DB_PATH: z.string().refine(isAbsolute),
  APPSHEET_TABLE: Identifier,
  APPSHEET_WEBHOOK_TOKEN: z.string().min(1),
  CAMPFIRE_EMAIL_ROOM_URL: z.url({ protocol: /^https$/ }),
  RESEND_API_KEY: z.string().min(1),
  RESEND_FROM: z.string().trim().min(1),
});
const BODY_LIMIT = 16 * 1024;
const tokenHash = (value: string) => createHash("sha256").update(value).digest();

const httpError = (error: string, status: 409 | 413 | 400 | 502 | 503) =>
  new HTTPException(status, { res: Response.json({ error }, { status }) });

const readJson = async (request: Request): Promise<unknown> => {
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  let input: unknown;
  try {
    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        size += value.byteLength;
        if (size > BODY_LIMIT) {
          await reader.cancel();
          throw httpError("body_too_large", 413);
        }
        chunks.push(value);
      }
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf-8"));
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }
    throw httpError("invalid_json", 400);
  } finally {
    reader?.releaseLock();
  }
  return input;
};

const confirmEmail = async (
  store: EmailNotificationStore,
  original: ReturnType<EmailNotificationStore["get"]>,
  payload: z.infer<typeof Payload>,
  settings: z.infer<typeof Config>,
  log: RequestLogger,
  now: () => number,
) => {
  let row = original;
  if (
    row.email_status === "rejected" ||
    (row.first_attempt_at !== null && now() - row.first_attempt_at >= RETRY_WINDOW_MS)
  ) {
    throw httpError("needs_review", 409);
  }
  const owner = randomUUID();
  if (!store.claimEmail(row.key, owner, now())) {
    throw httpError("processing", 503);
  }
  row = store.get(row.key);
  if (row.first_attempt_at === null || now() - row.first_attempt_at >= RETRY_WINDOW_MS) {
    throw httpError("needs_review", 409);
  }
  const requestSubject = z
    .object({ subject: z.string() })
    .parse(JSON.parse(row.resend_request_json)).subject;
  const result = await sendResendEmail({
    apiKey: settings.RESEND_API_KEY,
    bodyJson: row.resend_request_json,
    idempotencyKey: `appsheet/${row.key}`,
  });
  log.set({ appsheet: { key: row.key, resend: result.kind } });
  if (result.kind !== "accepted") {
    store.finishEmail(row.key, owner, result.kind === "rejected" ? "rejected" : "uncertain", now());
    if (result.kind === "retryable") {
      throw httpError("retry_later", 503);
    }
    if (result.kind === "rejected" && result.needsReview) {
      throw httpError("needs_review", 409);
    }
    throw httpError("email_not_confirmed", 502);
  }
  const html = `<strong>Correo aceptado para envío</strong><br>Destinatario: ${escapeHtml(payload.email)}<br>Asunto: ${escapeHtml(requestSubject)}<br>App/tabla: ${escapeHtml(payload.appId)} / ${escapeHtml(payload.table)}<br>ID del registro: ${escapeHtml(payload.recordId)}<br>Resend ID: ${escapeHtml(result.id)}`;
  if (!store.acceptEmail(row.key, owner, result.id, html, now())) {
    throw httpError("processing", 503);
  }
  row = store.get(row.key);
  return row;
};

export const createAppSheetRouter = ({
  env = process.env,
  openStore = (path: string) => new EmailNotificationStore(path),
  now = Date.now,
}: {
  env?: Record<string, string | undefined>;
  openStore?: (path: string) => EmailNotificationStore;
  now?: () => number;
} = {}) => {
  const app = new Hono<EvlogVariables>();
  let store: EmailNotificationStore | undefined;

  app.post("/", async (c) => {
    const config = Config.safeParse(env);
    if (!config.success) {
      return c.json({ error: "not_configured" }, 503);
    }
    const settings = config.data;
    const auth = c.req.header("Authorization") ?? "";
    if (!timingSafeEqual(tokenHash(auth), tokenHash(`Bearer ${settings.APPSHEET_WEBHOOK_TOKEN}`))) {
      return c.json({ error: "unauthorized" }, 401);
    }

    const input = await readJson(c.req.raw);
    const parsed = Payload.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "invalid_payload" }, 400);
    }
    const payload = parsed.data;
    if (payload.appId !== settings.APPSHEET_APP_ID || payload.table !== settings.APPSHEET_TABLE) {
      return c.json({ error: "forbidden_source" }, 403);
    }

    const log = c.get("log");
    const identity = notificationIdentity(payload);
    log.set({ appsheet: { key: identity.key } });
    try {
      store ??= openStore(settings.APPSHEET_DB_PATH);
      const bodyJson = JSON.stringify({
        from: settings.RESEND_FROM,
        html: await renderMaintenanceEmail(payload.recordId),
        subject: MAINTENANCE_SUBJECT,
        text: maintenanceEmailText(payload.recordId),
        to: [payload.email],
      });
      let row = store.create({ ...identity, bodyJson, now: now() });
      if (row.email_status !== "accepted") {
        row = await confirmEmail(store, row, payload, settings, log, now);
      }
      if (row.campfire_status === "posted") {
        return c.json({ ok: true, status: "already_processed" }, 200);
      }
      if (row.campfire_status !== "pending") {
        return c.json({ error: "needs_review" }, 409);
      }
      if (!row.campfire_html || !store.claimCampfire(row.key, now())) {
        return c.json({ error: "needs_review" }, 409);
      }
      try {
        await postToRoom(
          row.campfire_html,
          log,
          settings.CAMPFIRE_EMAIL_ROOM_URL,
          AbortSignal.timeout(20_000),
        );
      } catch {
        store.finishCampfire(row.key, "uncertain", now());
        return c.json({ error: "campfire_not_confirmed" }, 502);
      }
      if (!store.finishCampfire(row.key, "posted", now())) {
        return c.json({ error: "needs_review" }, 409);
      }
      log.info("appsheet notification completed", {
        appsheet: { campfire: "posted", email: "accepted", key: row.key },
      });
      return c.json({ ok: true, status: "processed" }, 200);
    } catch (error) {
      if (error instanceof HTTPException) {
        throw error;
      }
      if (error instanceof Error && error.message === "payload_conflict") {
        return c.json({ error: "payload_conflict" }, 409);
      }
      log.error("appsheet ledger unavailable", { appsheet: { key: identity.key } });
      return c.json({ error: "storage_unavailable" }, 503);
    }
  });
  return app;
};
