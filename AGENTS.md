# Hermes

Hermes bridges GitHub and Dokploy webhooks to Campfire. AppSheet registrations receive an acknowledgement through Resend and a notice in a dedicated Campfire room, backed by a persistent SQLite ledger.

## Product boundaries

Keep Hermes small: add integrations for concrete needs, prefer direct handler changes, and justify new dependencies against the existing stack. Discuss persistence, queues, plugin systems, or framework rewrites before introducing them.

AppSheet's authorized persistence is `bun:sqlite`, one instance with a persistent volume. Preserve the exact Resend request and stable key across retries. Never resend an accepted email or automatically release an uncertain Campfire reservation. See README's AppSheet operation instructions before recovery changes. GitHub and Dokploy remain stateless.

Reduce routine noise and duplicate notifications. Prioritize CI and deployment failure alerts when evaluating delivery changes.

Implement and verify authorized local changes autonomously. Confirm changes to notification events/actions, branch filters, or destination rooms unless the user's request already authorizes them.

Production deployments and test messages to real Campfire rooms require explicit authorization. Use simulated sends locally.

## Discovery

If `.codegraph/` exists, use CodeGraph before text searches or code reads. Otherwise, use `rg`. Create an index only when asked.

## Task references

Before editing or reviewing runtime behavior, read the applicable sections of [CODING_STANDARDS.md](CODING_STANDARDS.md). For documentation edits, read its documentation verification section:

- **Handlers, message copy, or routing:** [Notification behavior](CODING_STANDARDS.md#notification-behavior).
- **Payloads, HTML, signature verification, or logs:** [External input](CODING_STANDARDS.md#external-input).
- **Campfire sends, retries, or delivery errors:** [Delivery](CODING_STANDARDS.md#delivery).
- **Runtime changes or reviews:** [Verification](CODING_STANDARDS.md#verification), then the matching change branch.
- **Documentation or configuration changes:** [Documentation and configuration](CODING_STANDARDS.md#documentation-and-configuration).

## Handoff

Report the change, verification evidence, and remaining limits.

If a user action is required, end with **What I need from you** and numbered actions specifying where to act and what to send back. Otherwise, end with "Nothing needed from you right now."
