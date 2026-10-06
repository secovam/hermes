import type { RequestLogger } from "evlog";
import { env } from "./env.js";

export const postToRoom = async (
  html: string,
  log: RequestLogger,
  roomUrl?: string,
): Promise<void> => {
  const targetUrl = roomUrl ?? env.CAMPFIRE_ROOM_URL;

  const start = Date.now();

  try {
    const res = await fetch(targetUrl, {
      body: html,
      headers: {
        "Content-Type": "text/html",
      },
      method: "POST",
    });

    const duration = Date.now() - start;

    if (!res.ok) {
      log.error("campfire request failed", {
        campfire: { duration_ms: duration, status: res.status },
      });
      throw new Error(`Campfire returned ${res.status}`);
    }

    log.info("campfire message posted", {
      campfire: { duration_ms: duration },
    });
  } catch (error) {
    const duration = Date.now() - start;
    log.error("campfire request error", {
      campfire: {
        duration_ms: duration,
        error: (error as Error).message,
      },
    });
    throw error;
  }
};
