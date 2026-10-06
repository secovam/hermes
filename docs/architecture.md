# Architecture

## Request flow

- `POST /webhook` (`src/index.ts`) → `verifyGitHubSignature` (`src/verify.ts`, HMAC with `GITHUB_WEBHOOK_SECRET`; skipped when `NODE_ENV=development`) → `routeEvent` (`src/router.ts`) looks up the `x-github-event` header in its `handlers` map. Unmapped events and `ping` return 200 and post nothing.
- `POST /dokploy` → `handleDokployNotification` (`src/handlers/dokploy.ts`), no signature check.
- Every handler ends in `postToRoom(html, log, roomUrl?)` (`src/campfire.ts`), the only outbound call. Without `roomUrl` it posts to `CAMPFIRE_ROOM_URL`.

## File map

- `src/handlers/*`: one file per GitHub event, plus `dokploy.ts`. `review-bot-comment.ts` handles both `issue_comment` and `pull_request_review_comment`.
- `src/review-bots.ts`: `REVIEW_BOTS` (bot login → display label) decides whose PR comments are published; also the comment formatting and HTML escaping.
- `src/env.ts`: every env var, Zod-validated at startup.

## Handler conventions

- Parse `payload: unknown` with a Zod schema at the top of the file; declare only the fields you read.
- Filter with early returns (`action`, branch, conclusion) before building the message.
- Build the message as an HTML string in Spanish, starting with an emoji and `<strong>repo</strong> · `, matching the README event table. Escape untrusted text (comment bodies, titles) with `escapeHtml` from `src/review-bots.ts`.
- Rooms other than `CAMPFIRE_ROOM_URL` are optional: read them from `env` and throw `"<VAR> not configured"` when absent, so only that feature fails.
- End with `log.info("<event> handled", { ... })`.

## Adding a GitHub event handler

1. Create `src/handlers/<event>.ts` exporting `handle<Event>(payload: unknown, log: RequestLogger): Promise<void>`, following the conventions above (`src/handlers/release.ts` is the smallest example).
2. Register it in the `handlers` map in `src/router.ts`, keyed by the exact GitHub event name.
3. Update the README: add rows to the "Eventos soportados" table and add the event to the webhook event list in "Despliegue (Dokploy)" step 3. The org webhook only sends events that are subscribed there.
4. If it posts to a new room, add the env var per `CODING_STANDARDS.md`.

## Changing which review bots are published

Edit `REVIEW_BOTS` in `src/review-bots.ts`; the key is the GitHub login (e.g. `coderabbitai[bot]`). Then update the README event table and the room note under it.
