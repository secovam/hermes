import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";
import { escapeHtml } from "../review-bots.js";

const WorkflowRunPayloadSchema = z.object({
  action: z.string(),
  repository: z.object({
    full_name: z.string(),
  }),
  workflow_run: z.object({
    conclusion: z.string().nullable(),
    event: z.string().optional(),
    head_branch: z.string(),
    html_url: z.string(),
    name: z.string(),
    pull_requests: z.array(z.object({ number: z.number().int().positive() })).optional(),
  }),
});

export const handleWorkflowRun = async (payload: unknown, log: RequestLogger): Promise<void> => {
  const parsed = WorkflowRunPayloadSchema.parse(payload);

  if (parsed.action !== "completed") {
    return;
  }

  const run = parsed.workflow_run;

  if (run.conclusion !== "failure") {
    return;
  }

  const pullRequests = run.pull_requests ?? [];
  const isPullRequest =
    run.event === "pull_request" || run.event === "pull_request_target" || pullRequests.length > 0;

  if (run.head_branch !== "main" && !isPullRequest) {
    return;
  }

  const roomUrl = process.env.CAMPFIRE_CI_ROOM_URL;
  if (!roomUrl) {
    throw new Error("CAMPFIRE_CI_ROOM_URL not configured");
  }

  const repo = escapeHtml(parsed.repository.full_name);
  const name = escapeHtml(run.name);
  const branch = escapeHtml(run.head_branch);
  let workflow = name;

  const url = URL.canParse(run.html_url) ? new URL(run.html_url) : undefined;
  if (url?.protocol === "https:") {
    workflow = `<a href="${escapeHtml(url.href)}">${name}</a>`;
  }

  let result: string;
  if (isPullRequest && pullRequests.length > 0) {
    const numbers = pullRequests.map(({ number }) => `#${number}`).join(", ");
    result = `falló en PR ${numbers}`;
  } else if (isPullRequest) {
    result = `falló en un PR de la rama ${branch}`;
  } else {
    result = "falló en main";
  }

  const html = `💥 <strong>${repo}</strong> · workflow ${workflow} ${result}`;
  await postToRoom(html, log, roomUrl);
  log.info("workflow run failed handled", {
    workflow_run: { name: run.name, repo: parsed.repository.full_name },
  });
};
