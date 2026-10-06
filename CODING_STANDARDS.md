# Coding Standards

Applied during review: check each rule against the diff.

- A diff that adds or renames an env var updates `src/env.ts`, `.env.example`, and the README env section together.
- A diff that changes user-visible behavior (supported events, message format, setup steps) updates the README in the same change; the README is the user-facing contract.
- A diff that adds or changes a handler in `src/handlers/` follows the handler conventions in `docs/architecture.md`.
