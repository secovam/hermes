import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { chmodSync, closeSync, openSync } from "node:fs";
import { isAbsolute } from "node:path";
import { z } from "zod";

export const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
const LEASE_MS = 60_000;
const Notification = z.object({
  campfire_html: z.string().nullable(),
  campfire_status: z.enum(["pending", "sending", "posted", "uncertain"]),
  created_at: z.number(),
  email_status: z.enum(["pending", "sending", "accepted", "uncertain", "rejected"]),
  first_attempt_at: z.number().nullable(),
  key: z.string(),
  lease_owner: z.string().nullable(),
  lease_until: z.number().nullable(),
  payload_hash: z.string(),
  resend_id: z.string().nullable(),
  resend_request_json: z.string(),
  updated_at: z.number(),
});

export const notificationIdentity = (input: {
  appId: string;
  table: string;
  event: string;
  recordId: string;
  email: string;
  name: string;
}) => {
  const hash = (values: string[]) =>
    createHash("sha256").update(JSON.stringify(values)).digest("hex");
  return {
    key: hash([input.appId, input.table, input.event, input.recordId]),
    payloadHash: hash([input.email, input.name]),
  };
};

export class EmailNotificationStore {
  readonly path: string;
  private readonly db: Database;

  constructor(path: string) {
    if (!isAbsolute(path)) {
      throw new Error("APPSHEET_DB_PATH must be absolute");
    }
    this.path = path;
    closeSync(openSync(path, "a", 0o600));
    chmodSync(path, 0o600);
    this.db = new Database(path, { strict: true });
    try {
      this.db.run(`PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=1000;
        CREATE TABLE IF NOT EXISTS notifications (
          key TEXT PRIMARY KEY, payload_hash TEXT NOT NULL, resend_request_json TEXT NOT NULL,
          email_status TEXT NOT NULL DEFAULT 'pending' CHECK(email_status IN ('pending','sending','accepted','uncertain','rejected')),
          resend_id TEXT, first_attempt_at INTEGER, lease_owner TEXT, lease_until INTEGER,
          campfire_status TEXT NOT NULL DEFAULT 'pending' CHECK(campfire_status IN ('pending','sending','posted','uncertain')),
          campfire_html TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
        );`);
    } catch (error) {
      this.db.close();
      throw error;
    }
  }

  close() {
    this.db.close();
  }

  get(key: string) {
    return Notification.parse(this.db.query("SELECT * FROM notifications WHERE key = ?").get(key));
  }

  create({
    key,
    payloadHash,
    bodyJson,
    now,
  }: {
    key: string;
    payloadHash: string;
    bodyJson: string;
    now: number;
  }) {
    return this.db
      .transaction(() => {
        this.db
          .query(`INSERT INTO notifications (key, payload_hash, resend_request_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?) ON CONFLICT(key) DO NOTHING`)
          .run(key, payloadHash, bodyJson, now, now);
        const row = this.get(key);
        if (row.payload_hash !== payloadHash) {
          throw new Error("payload_conflict");
        }
        return row;
      })
      .immediate();
  }

  claimEmail(key: string, owner: string, now: number) {
    return (
      this.db
        .query(`UPDATE notifications SET email_status='sending', lease_owner=?, lease_until=?,
      first_attempt_at=COALESCE(first_attempt_at, ?), updated_at=?
      WHERE key=? AND email_status IN ('pending','sending','uncertain')
      AND (lease_until IS NULL OR lease_until <= ?)
      AND (first_attempt_at IS NULL OR first_attempt_at > ?)`)
        .run(owner, now + LEASE_MS, now, now, key, now, now - RETRY_WINDOW_MS).changes === 1
    );
  }

  acceptEmail(key: string, owner: string, id: string, html: string, now: number) {
    return (
      this.db
        .query(`UPDATE notifications SET email_status='accepted', resend_id=?, campfire_html=?,
      lease_owner=NULL, lease_until=NULL, updated_at=? WHERE key=? AND lease_owner=? AND email_status='sending'`)
        .run(id, html, now, key, owner).changes === 1
    );
  }

  finishEmail(key: string, owner: string, status: "uncertain" | "rejected", now: number) {
    return (
      this.db
        .query(`UPDATE notifications SET email_status=?, lease_owner=NULL, lease_until=NULL,
      updated_at=? WHERE key=? AND lease_owner=? AND email_status='sending'`)
        .run(status, now, key, owner).changes === 1
    );
  }

  claimCampfire(key: string, now: number) {
    return (
      this.db
        .query(`UPDATE notifications SET campfire_status='sending', updated_at=?
      WHERE key=? AND email_status='accepted' AND campfire_status='pending' AND campfire_html IS NOT NULL`)
        .run(now, key).changes === 1
    );
  }

  finishCampfire(key: string, status: "posted" | "uncertain", now: number) {
    return (
      this.db
        .query(`UPDATE notifications SET campfire_status=?, updated_at=?
      WHERE key=? AND campfire_status='sending'`)
        .run(status, now, key).changes === 1
    );
  }
}
