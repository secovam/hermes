import { Hono } from "hono";
import { initLogger } from "evlog";
import { evlog } from "evlog/hono";
import type { RequestLogger } from "evlog";
import { routeEvent } from "./router.js";
import { verifyGitHubSignature } from "./verify.js";
import { handleDokployNotification } from "./handlers/dokploy.js";
import { env } from "./env.js";

initLogger({ env: { service: "hermes" } });

interface Variables {
  rawBody: string;
  log: RequestLogger;
}

const app = new Hono<{ Variables: Variables }>();

app.use(evlog());

const extractRepo = (payload: Record<string, unknown>): string | undefined => {
  const repo = payload.repository as Record<string, string> | undefined;
  return repo?.full_name;
};

app.post("/webhook", verifyGitHubSignature, async (c) => {
  const log = c.get("log");
  const event = c.req.header("x-github-event");
  const deliveryId = c.req.header("x-github-delivery");
  const rawBody = c.get("rawBody");

  log.set({
    webhook: { delivery_id: deliveryId, event },
  });

  if (event === "ping") {
    log.info("ping received");
    return c.json({ ok: true }, 200);
  }

  const payload = JSON.parse(rawBody) as Record<string, unknown>;
  const repo = extractRepo(payload);

  log.set({
    action: payload.action as string | undefined,
    repo,
    webhook: { delivery_id: deliveryId, event, repo },
  });

  const handled = await routeEvent(event, payload, log);

  if (!handled) {
    return c.json({ ok: true }, 200);
  }

  log.info("webhook processed");
  return c.json({ ok: true }, 200);
});

app.post("/dokploy", async (c) => {
  const log = c.get("log");
  const payload = await c.req.json();

  await handleDokployNotification(payload, log);

  log.info("dokploy notification processed");
  return c.json({ ok: true }, 200);
});

console.log(JSON.stringify({ level: "info", msg: "server starting", port: env.PORT }));

export default {
  fetch: app.fetch,
  port: env.PORT,
};
