import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";

const PushPayloadSchema = z.object({
  head_commit: z
    .object({
      author: z.object({
        username: z.string(),
      }),
      id: z.string(),
      message: z.string(),
      url: z.string(),
    })
    .optional(),
  ref: z.string(),
  repository: z.object({
    full_name: z.string(),
  }),
});

export const handlePush = async (payload: unknown, log: RequestLogger): Promise<void> => {
  const parsed = PushPayloadSchema.parse(payload);

  if (parsed.ref !== "refs/heads/main") {
    return;
  }

  const commit = parsed.head_commit;
  if (!commit) {
    return;
  }

  const sha7 = commit.id.slice(0, 7);
  const [firstLine] = commit.message.split("\n");
  const repo = parsed.repository.full_name;
  const author = commit.author.username;

  const html = `📝 <strong>${repo}</strong> · <a href="${commit.url}">${sha7}</a> ${firstLine} — ${author}`;

  await postToRoom(html, log);
  log.info("push handled", { push: { author, repo, sha: sha7 } });
};
