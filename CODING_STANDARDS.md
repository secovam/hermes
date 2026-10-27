# Coding standards for Hermes

Use the implementation as the authority for current behavior. Read package scripts and formatter/linter configuration for commands and style rules.

## Notification behavior

Read the affected handler's filters and room selection before editing it. Keep notification text in Spanish unless the user authorizes another language. Messages should identify the event with concise context and useful links.

Preserve distinct destinations for ordinary GitHub events, review bot comments, and Dokploy notifications. A missing dedicated destination must not silently fall back to the general room.

When an authorized change alters behavior or configuration, update the affected documentation.

## External input

### Payloads and HTML

Accept external payloads as `unknown`; validate them with Zod at the handler boundary.

Treat webhook text and URLs as untrusted. Escape interpolated HTML text and attribute values; validate link schemes.

### GitHub signatures

Verify signatures against the raw request body. Restrict the verification bypass to `NODE_ENV=development`.

### Logs

Use the request's evlog logger for event context and delivery results. Never log webhook secrets or room URLs containing bot credentials. Keep complete payloads out of default logs.

## Delivery

Await Campfire sends and propagate delivery failures so failed sends cannot produce successful processing results.

Before adding retries, evaluate duplicate notifications and request duration. Hermes has no persistent queue. GitHub and Dokploy have no delivery deduplication. Claim exactly-once delivery only when an implemented mechanism supports it.

AppSheet is the exception to stateless delivery. Its SQLite ledger records email acceptance and the Campfire reservation separately. Persist the Resend request before sending. Use its stable idempotency key and stored bytes only within 23 hours of the original attempt, with a 60-second owner lease and a 20-second network timeout. An accepted email never returns to pending. An uncertain Campfire reservation requires manual reconciliation, regardless of age. A successful AppSheet response requires both accepted email and posted notice. The ledger prevents blind retries, not exactly-once delivery. GitHub and Dokploy have no delivery ledger.

## Verification

Use repository scripts for linting and formatting. Scope formatting to changed files when possible, and inspect the diff for unrelated edits.

For runtime changes, use Bun's built-in test runner with focused tests and stub Campfire `fetch`. Configure dummy environment variables before importing modules: some configuration is read at import time.

A change is ready when the matching checks below pass and the handoff names the evidence and any remaining verification limit.

### Handlers, messages, and routing

Assert message content, destination room, and send count. Cover an accepted event, a relevant ignored event, and a failure case.

For destination changes, cover missing dedicated configuration so an accidental general-room fallback is observable.

### Campfire delivery

Cover successful sends and delivery failures with simulated responses. Verify that callers observe the failure and do not report successful processing.

For retry changes, verify the permitted attempt count and resulting send count.

### Routes and signatures

Exercise the Hono request path with valid signatures, missing signatures, and invalid signatures. For verification changes, include malformed signatures and the development bypass boundary.

### Bug fixes

Reproduce the reported failure before changing the implementation when possible. Verify the corrected behavior and a relevant neighboring case.

### AppSheet persistence

AppSheet tests use temporary SQLite files and simulated Resend and Campfire responses. Cover concurrent claims, reopen/restart, the 23-hour boundary, and crashes between effects and commits. Assert that missing dedicated configuration or storage failures cannot send an email. Provider mocks count requests separately from simulated acceptances. Never use production room URLs or email credentials in tests.

### Documentation and configuration

Check documentation claims against their referenced implementation or configuration. Run the relevant formatting check.

For executable configuration changes, run the affected tool or build locally when available and report anything that could not be exercised.
