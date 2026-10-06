# Operations

Setup facts live in the README; this doc maps symptoms to the README section that resolves them. Check the deployed config in Dokploy before reading code.

## Triage

- **All alerts stopped at once**: a required env var (`GITHUB_WEBHOOK_SECRET`, `CAMPFIRE_ROOM_URL`) is missing or invalid, so `src/env.ts` crashes the process at boot. The Zod error is in the Dokploy logs. Fix it in the Hermes service → Environment and redeploy (README "Despliegue (Dokploy)" step 2; the variables are listed in "Variables de entorno").
- **Only deploy or only review-bot alerts are missing**: their optional room (`CAMPFIRE_DOKPLOY_ROOM_URL` or `CAMPFIRE_REVIEW_ROOM_URL`) is unset. The handler throws `"<VAR> not configured"` and the request fails with 500. To get a room URL, follow README "Obtener la URL de una sala de Campfire".
- **GitHub deliveries return 401**: the webhook secret in GitHub differs from `GITHUB_WEBHOOK_SECRET` (README "Despliegue (Dokploy)" step 3). Recent deliveries are on the org webhook settings page.
- **GitHub deliveries return 200 but nothing posts**: the event is unmapped in `src/router.ts`, or the handler filtered it out (non-`main` push, unsupported `action`, comment from a login not in `REVIEW_BOTS`). Compare against README "Eventos soportados".
- **Deliveries return 500**: look for `campfire request failed` / `campfire request error` in the logs (bad room URL or Campfire down), or a Zod parse error (payload shape changed). Log format: README "Logs".
