import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";

const IssuesPayloadSchema = z.object({
  action: z.string(),
  issue: z.object({
    html_url: z.string(),
    number: z.number(),
    title: z.string(),
    user: z.object({
      login: z.string(),
    }),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});

export const handleIssues = async (payload: unknown, log: RequestLogger): Promise<void> => {
  const parsed = IssuesPayloadSchema.parse(payload);

  if (parsed.action !== "opened" && parsed.action !== "closed") {
    return;
  }

  const repo = parsed.repository.full_name;
  const { issue } = parsed;
  const n = issue.number;
  const url = issue.html_url;
  const { title } = issue;

  if (parsed.action === "opened") {
    const author = issue.user.login;
    const html = `🐛 <strong>${repo}</strong> · issue <a href="${url}">#${n} ${title}</a> por ${author}`;
    await postToRoom(html, log);
    log.info("issue opened handled", { issue: { author, number: n, repo } });
    return;
  }

  const html = `☑️ <strong>${repo}</strong> · issue <a href="${url}">#${n} ${title}</a> cerrado`;
  await postToRoom(html, log);
  log.info("issue closed handled", { issue: { number: n, repo } });
};
