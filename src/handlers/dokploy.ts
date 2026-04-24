import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";

const DokployPayloadSchema = z.object({
  message: z.string(),
  timestamp: z.string(),
  title: z.string(),
});

export const handleDokployNotification = async (
  payload: unknown,
  log: RequestLogger,
): Promise<void> => {
  const parsed = DokployPayloadSchema.parse(payload);

  const html = `🚀 <strong>Dokploy</strong> · ${parsed.title}: ${parsed.message}`;

  await postToRoom(html, log);
  log.info("dokploy notification handled", {
    dokploy: { message: parsed.message, title: parsed.title },
  });
};
