import { readFile } from "node:fs/promises";

// Fails when the README, .env.example, and the code disagree on env vars or subscribed GitHub events.
const ENV_SCHEMA_KEY = /^\s+([A-Z][A-Z0-9_]*):/gm;
const ENV_LINE_KEY = /^([A-Z][A-Z0-9_]*)=/gm;
const README_ENV_BLOCK = /```env\n([\s\S]*?)```/;
const ROUTER_HANDLER_KEY = /^\s+([a-z_]+): handle/gm;
const README_WEBHOOK_EVENTS = /^\s*- Eventos: (.+)$/m;
const BACKTICKED = /`([a-z_]+)`/g;

const read = (path: string): Promise<string> => readFile(path, "utf-8");

const capture = (text: string, pattern: RegExp): Set<string> =>
  new Set(Array.from(text.matchAll(pattern), (match) => match[1] ?? ""));

const diff = (a: Set<string>, b: Set<string>): string[] => [...a].filter((key) => !b.has(key));

const [envTs, envExample, readme, router] = await Promise.all([
  read("src/env.ts"),
  read(".env.example"),
  read("README.md"),
  read("src/router.ts"),
]);

const errors: string[] = [];

const compare = (
  label: string,
  expected: Set<string>,
  actualLabel: string,
  actual: Set<string>,
) => {
  for (const key of diff(expected, actual)) {
    errors.push(`${key}: in ${label} but missing from ${actualLabel}`);
  }
  for (const key of diff(actual, expected)) {
    errors.push(`${key}: in ${actualLabel} but missing from ${label}`);
  }
};

const schemaKeys = capture(envTs, ENV_SCHEMA_KEY);
compare("src/env.ts", schemaKeys, ".env.example", capture(envExample, ENV_LINE_KEY));
compare(
  "src/env.ts",
  schemaKeys,
  "the README env block",
  capture(README_ENV_BLOCK.exec(readme)?.[1] ?? "", ENV_LINE_KEY),
);
compare(
  "the handlers map in src/router.ts",
  capture(router, ROUTER_HANDLER_KEY),
  "the README webhook event list",
  capture(README_WEBHOOK_EVENTS.exec(readme)?.[1] ?? "", BACKTICKED),
);

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}
