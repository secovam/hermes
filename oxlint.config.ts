import { defineConfig } from "oxlint";

import core from "ultracite/oxlint/core";

export default defineConfig({
  extends: [core],
  overrides: [
    {
      files: ["src/env.ts"],
      rules: { "node/no-process-env": "off" },
    },
  ],
  rules: {
    "node/no-process-env": "error",
  },
});
