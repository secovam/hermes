# Coding Standards

Judgement rules for review; `bun run check` enforces the mechanical ones. Check each rule against the diff.

- A diff that changes user-visible behavior (supported events, message format, rooms, setup steps) updates `README.md` in the same change; the README is the user-facing contract.
- A handler parses `payload: unknown` with a Zod schema that declares only the fields it reads.
- A message is HTML in Spanish shaped like its row in the README "Eventos soportados" table, with untrusted text (titles, comment bodies, logins) passed through `escapeHtml` from `src/review-bots.ts`.
- A feature posting to a room other than `CAMPFIRE_ROOM_URL` makes that room optional and throws `"<VAR> not configured"` when it is unset, so only that feature fails.
