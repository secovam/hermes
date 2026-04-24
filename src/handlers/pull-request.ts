import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";

const PullRequestPayloadSchema = z.object({
  action: z.string(),
  number: z.number(),
  pull_request: z.object({
    html_url: z.string(),
    merged: z.boolean().optional(),
    title: z.string(),
    user: z.object({
      login: z.string(),
    }),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
  sender: z.object({
    login: z.string(),
  }),
});

export const handlePullRequest = async (payload: unknown, log: RequestLogger): Promise<void> => {
  const parsed = PullRequestPayloadSchema.parse(payload);

  if (parsed.action !== "opened" && parsed.action !== "closed") {
    return;
  }

  const repo = parsed.repository.full_name;
  const pr = parsed.pull_request;
  const n = parsed.number;
  const url = pr.html_url;
  const { title } = pr;

  if (parsed.action === "opened") {
    const author = pr.user.login;
    const html = `🔀 <strong>${repo}</strong> · PR <a href="${url}">#${n} ${title}</a> abierto por ${author}`;
    await postToRoom(html, log);
    log.info("pr opened handled", { pull_request: { author, number: n, repo } });
    return;
  }

  if (parsed.action === "closed") {
    if (pr.merged) {
      const author = parsed.sender.login;
      const html = `✅ <strong>${repo}</strong> · PR <a href="${url}">#${n} ${title}</a> mergeado por ${author}`;
      await postToRoom(html, log);
      log.info("pr merged handled", {
        pull_request: { author, number: n, repo },
      });
    } else {
      const html = `❌ <strong>${repo}</strong> · PR <a href="${url}">#${n} ${title}</a> cerrado sin merge`;
      await postToRoom(html, log);
      log.info("pr closed without merge handled", {
        pull_request: { number: n, repo },
      });
    }
  }
};
