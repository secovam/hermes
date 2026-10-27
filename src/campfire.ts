import type { RequestLogger } from "evlog";

const { CAMPFIRE_ROOM_URL } = process.env;

if (!CAMPFIRE_ROOM_URL) {
  throw new Error("CAMPFIRE_ROOM_URL not configured");
}

export const postToRoom = async (
  html: string,
  log: RequestLogger,
  roomUrl?: string,
  signal?: AbortSignal,
): Promise<void> => {
  const targetUrl = roomUrl ?? CAMPFIRE_ROOM_URL;

  if (!targetUrl) {
    throw new Error("No room URL configured");
  }

  const start = Date.now();

  try {
    const res = await fetch(targetUrl, {
      body: html,
      headers: {
        "Content-Type": "text/html",
      },
      method: "POST",
      signal,
      ...(signal ? { redirect: "error" as const } : {}),
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
        error: error instanceof Error ? error.name : "UnknownError",
      },
    });
    throw error;
  }
};
