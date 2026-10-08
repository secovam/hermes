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

Before adding retries, evaluate duplicate notifications and request duration. Hermes has no persistent queue or delivery deduplication; reliable delivery is a goal. Claim exactly-once delivery only when an implemented mechanism supports it.

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

### Documentation and configuration

Check documentation claims against their referenced implementation or configuration. Run the relevant formatting check.

For executable configuration changes, run the affected tool or build locally when available and report anything that could not be exercised.
