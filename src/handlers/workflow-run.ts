import { z } from "zod";
import type { RequestLogger } from "evlog";
import { postToRoom } from "../campfire.js";

const WorkflowRunPayloadSchema = z.object({
  action: z.string(),
  repository: z.object({
    full_name: z.string(),
  }),
  workflow_run: z.object({
    conclusion: z.string().nullable(),
    head_branch: z.string(),
    html_url: z.string(),
    name: z.string(),
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

  if (run.head_branch !== "main") {
    return;
  }

  const repo = parsed.repository.full_name;
  const { name } = run;
  const url = run.html_url;

  const html = `💥 <strong>${repo}</strong> · workflow <a href="${url}">${name}</a> falló en main`;
  await postToRoom(html, log);
  log.info("workflow run failed handled", { workflow_run: { name, repo } });
};
