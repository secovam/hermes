import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";

const { CAMPFIRE_DOKPLOY_ROOM_URL } = process.env;

const DokployPayloadSchema = z.object({
  applicationName: z.string().optional(),
  applicationType: z.string().optional(),
  buildLink: z.string().optional(),
  date: z.string().optional(),
  domains: z.string().optional(),
  message: z.string(),
  projectName: z.string().optional(),
  status: z.enum(["success", "error"]).optional(),
  timestamp: z.string(),
  title: z.string(),
  type: z.string().optional(),
});

export const handleDokployNotification = async (
  payload: unknown,
  log: RequestLogger,
): Promise<void> => {
  if (!CAMPFIRE_DOKPLOY_ROOM_URL) {
    throw new Error("CAMPFIRE_DOKPLOY_ROOM_URL not configured");
  }

  const parsed = DokployPayloadSchema.parse(payload);

  // Build app identifier from available fields
  const appName = parsed.applicationName ?? parsed.projectName;
  const appInfo = appName ? ` <code>${appName}</code> ·` : "";

  // Add build link if available
  const buildLink = parsed.buildLink ? ` <a href="${parsed.buildLink}">Ver logs</a>` : "";

  // Choose emoji based on status
  let icon = "🚀";
  if (parsed.status === "error") {
    icon = "❌";
  } else if (parsed.status === "success") {
    icon = "✅";
  }

  const html = `${icon} <strong>Dokploy</strong> ·${appInfo} ${parsed.title}: ${parsed.message}${buildLink}`;

  await postToRoom(html, log, CAMPFIRE_DOKPLOY_ROOM_URL);
  log.info("dokploy notification handled", {
    dokploy: {
      app_name: appName,
      message: parsed.message,
      status: parsed.status,
      title: parsed.title,
    },
  });
};
