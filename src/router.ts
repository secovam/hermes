import type { RequestLogger } from "evlog";
import { handleIssues } from "./handlers/issues.js";
import { handlePullRequest } from "./handlers/pull-request.js";
import { handlePush } from "./handlers/push.js";
import { handleRelease } from "./handlers/release.js";
import {
  handleIssueComment,
  handlePullRequestReviewComment,
} from "./handlers/review-bot-comment.js";
import { handleWorkflowRun } from "./handlers/workflow-run.js";

const handlers: Record<string, (payload: unknown, log: RequestLogger) => Promise<void>> = {
  issue_comment: handleIssueComment,
  issues: handleIssues,
  pull_request: handlePullRequest,
  pull_request_review_comment: handlePullRequestReviewComment,
  push: handlePush,
  release: handleRelease,
  workflow_run: handleWorkflowRun,
};

export const routeEvent = async (
  event: string | undefined,
  payload: unknown,
  log: RequestLogger,
): Promise<boolean> => {
  const handler = event ? handlers[event] : undefined;

  if (!handler) {
    return false;
  }

  await handler(payload, log);
  return true;
};
