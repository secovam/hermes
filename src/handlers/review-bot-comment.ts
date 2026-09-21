import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";
import { formatBotComment, reviewBotLabel } from "../review-bots.js";

const CommentSchema = z.object({
  body: z.string(),
  html_url: z.string(),
  path: z.string().optional(),
  user: z.object({
    login: z.string(),
  }),
});

const IssueCommentPayloadSchema = z.object({
  action: z.string(),
  comment: CommentSchema,
  issue: z.object({
    number: z.number(),
    pull_request: z.unknown().optional(),
    title: z.string(),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});

const ReviewCommentPayloadSchema = z.object({
  action: z.string(),
  comment: CommentSchema,
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
  }),
  repository: z.object({
    full_name: z.string(),
  }),
});

const publishBotComment = async (
  input: {
    body: string;
    login: string;
    number: number;
    path?: string;
    repo: string;
    title: string;
    url: string;
  },
  log: RequestLogger,
): Promise<void> => {
  const bot = reviewBotLabel(input.login);
  if (!bot) {
    return;
  }

  const html = formatBotComment({
    body: input.body,
    bot,
    number: input.number,
    path: input.path,
    repo: input.repo,
    title: input.title,
    url: input.url,
  });

  await postToRoom(html, log);
  log.info("review bot comment handled", {
    comment: { bot, number: input.number, repo: input.repo },
  });
};

export const handleIssueComment = async (payload: unknown, log: RequestLogger): Promise<void> => {
  const parsed = IssueCommentPayloadSchema.parse(payload);

  if (parsed.action !== "created" || !parsed.issue.pull_request) {
    return;
  }

  await publishBotComment(
    {
      body: parsed.comment.body,
      login: parsed.comment.user.login,
      number: parsed.issue.number,
      repo: parsed.repository.full_name,
      title: parsed.issue.title,
      url: parsed.comment.html_url,
    },
    log,
  );
};

export const handlePullRequestReviewComment = async (
  payload: unknown,
  log: RequestLogger,
): Promise<void> => {
  const parsed = ReviewCommentPayloadSchema.parse(payload);

  if (parsed.action !== "created") {
    return;
  }

  await publishBotComment(
    {
      body: parsed.comment.body,
      login: parsed.comment.user.login,
      number: parsed.pull_request.number,
      path: parsed.comment.path,
      repo: parsed.repository.full_name,
      title: parsed.pull_request.title,
      url: parsed.comment.html_url,
    },
    log,
  );
};
