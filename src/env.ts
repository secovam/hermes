import { z } from "zod";

// Optional rooms only disable their own feature, so a missing one never takes down GitHub alerts.
const EnvSchema = z.object({
  CAMPFIRE_DOKPLOY_ROOM_URL: z.url().optional(),
  CAMPFIRE_REVIEW_ROOM_URL: z.url().optional(),
  CAMPFIRE_ROOM_URL: z.url(),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  NODE_ENV: z.string().optional(),
  PORT: z.coerce.number().int().default(3000),
});

export const env = EnvSchema.parse(process.env);
