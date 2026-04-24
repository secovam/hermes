import type { RequestLogger } from "evlog";
import { handleIssues } from "./handlers/issues.js";
import { handlePullRequest } from "./handlers/pull-request.js";
import { handlePush } from "./handlers/push.js";
import { handleRelease } from "./handlers/release.js";
import { handleWorkflowRun } from "./handlers/workflow-run.js";

const handlers: Record<string, (payload: unknown, log: RequestLogger) => Promise<void>> = {
  issues: handleIssues,
  pull_request: handlePullRequest,
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
