# Hermes

Stateless Bun + Hono bot: GitHub org webhooks and Dokploy deploy notifications → Campfire rooms. Deployed on Dokploy.

## Map

- `src/index.ts`: the two routes. `POST /webhook` → `verify.ts` (HMAC) → `router.ts` (event → handler). `POST /dokploy` → `handlers/dokploy.ts`.
- `src/handlers/*`: one file per GitHub event; each parses its payload with Zod and builds the HTML message.
- `src/campfire.ts`: `postToRoom`, the only outbound call. Defaults to `CAMPFIRE_ROOM_URL`.
- `src/review-bots.ts`: which bot logins get their PR comments published (to `CAMPFIRE_REVIEW_ROOM_URL`).
- `src/env.ts`: every env var, validated at startup. Add new vars here, then to `.env.example` and the README.

## Gotchas

- A missing required env var crashes the process at boot, so every alert stops at once. When "no alerts arrive", check the deployed env in Dokploy before the code.
- README is the user-facing contract (event table, env vars, setup steps); update it with any behavior change.

## Checks

`bun run check` (Ultracite: oxlint + oxfmt). `bun run fix` autofixes; the pre-commit hook runs it on staged files.
