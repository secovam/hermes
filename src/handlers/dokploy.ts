import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";

const { CAMPFIRE_DOKPLOY_ROOM_URL } = process.env;

const DokployPayloadSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
  title: z.string(),
});

export const handleDokployNotification = async (
  payload: unknown,
  log: RequestLogger,
): Promise<void> => {
  if (!CAMPFIRE_DOKPLOY_ROOM_URL) {
    throw new Error("CAMPFIRE_DOKPLOY_ROOM_URL not configured");
  }

  const parsed = DokployPayloadSchema.parse(payload);

  const html = `🚀 <strong>Dokploy</strong> · ${parsed.title}: ${parsed.message}`;

  await postToRoom(html, log, CAMPFIRE_DOKPLOY_ROOM_URL);
  log.info("dokploy notification handled", {
    dokploy: { message: parsed.message, title: parsed.title },
  });
};
