import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";

const ReleasePayloadSchema = z.object({
  action: z.string(),
  release: z.object({
    html_url: z.string(),
    tag_name: z.string(),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});

export const handleRelease = async (payload: unknown, log: RequestLogger): Promise<void> => {
  const parsed = ReleasePayloadSchema.parse(payload);

  if (parsed.action !== "published") {
    return;
  }

  const repo = parsed.repository.full_name;
  const { release } = parsed;
  const tag = release.tag_name;
  const url = release.html_url;

  const html = `🚀 <strong>${repo}</strong> · release <a href="${url}">${tag}</a> publicada`;
  await postToRoom(html, log);
  log.info("release published handled", { release: { repo, tag } });
};
