import type { RequestLogger } from "evlog";

const { CAMPFIRE_ROOM_URL } = process.env;

if (!CAMPFIRE_ROOM_URL) {
  throw new Error("CAMPFIRE_ROOM_URL not configured");
}

export const postToRoom = async (html: string, log: RequestLogger): Promise<void> => {
  const start = Date.now();

  try {
    const res = await fetch(CAMPFIRE_ROOM_URL, {
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
