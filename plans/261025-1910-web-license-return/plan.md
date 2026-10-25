# Socialchoice web app with perpetual licensing

Status: IMPLEMENTED AND LOCALLY VERIFIED — production rollout pending owner-controlled issuer setup and HTTPS acceptance. Owner accepted managed online storage and one perpetual license per account, usable on multiple devices. Existing owner workspace stays isolated. No production keys, purchases or customer records generated. See [delivery evidence](../reports/web-license-261025-customer-isolation-report.md).

## Outcome and constraints

- Resume the existing web app as the primary product, sold through one-time licenses.
- Preserve the existing interface, social integrations, publishing history and workspace data. Reuse working code; do not rebuild the application or remove desktop sources/data.
- Starter/Professional/Business remain the named editions. Feature limits, pricing and license issuer trust must be explicit; do not invent sales policy or generate production keys.
- Existing single-admin deployment remains private until customer isolation and backend license enforcement are verified.
- No publishing test, paid service, secret exposure or customer-data migration implied by this plan.

## Original baseline evidence (before implementation)

- `server/cloudflare-worker.js:6`: every request is routed to `single-admin-workspace`. It cannot safely serve unrelated customers as-is.
- `server/admin-auth.js:11`: authentication is a single configured administrator password and server-side sessions, not separate customer identities.
- `server/http-handler.js:77`: `/api/session` returns one workspace owner. Every authenticated request operates on the same injected store.
- `server/cloudflare-workspace.js:29`: one actor constructs one store and its private encrypted state. Existing media, OAuth state and publishing alarms belong to that workspace.
- `src/api/app-client.js`: normal browser requests already target the web API; Tauri is a separate runtime branch.
- `scripts/license-issuer.mjs`: existing SC2 licenses explicitly target `socialchoice-desktop` and machine identity. They must not be silently reinterpreted as web entitlements.
- Existing React UI, Node/SQLite and Cloudflare adapters, publishing and social sign-in remain available. Web license checks and customer registration are not implemented.

## Required product decisions

1. Accepted: managed online website with separate customer data on developer-operated infrastructure.
2. Accepted replacement of machine locking: one license belongs to one customer account and allows multiple devices. Separate sessions expire and can be revoked; no browser fingerprint or hardware restriction.
3. Implementation: preserve the existing owner Durable Object; add a private customer directory and separate SQLite Durable Object per customer. A server-authenticated routing context chooses the workspace. Customer OAuth callbacks use the same registered provider App and a Lax account cookie plus the existing OAuth nonce/state/session guards. Public signed media uses a customer-specific path and still validates its original capability inside that workspace.
4. SCW1 signed web licenses bind license ID, email and edition to one account. No automatic production key generation. Editions currently label the license; differentiated sales entitlements await owner policy and are not fabricated.

## Delivery phases after hosting choice

1. Specify the account/workspace ownership model and separate the existing owner workspace from new customers; preserve its actor identity and data. Define recovery and tenant routing from authenticated identity, never arbitrary client-supplied workspace IDs.
2. Implement real customer authentication and isolation across entities, private media, OAuth callbacks/state, provider tokens, notifications and scheduled/background publishing. Demonstrate cross-customer denial using independent sessions.
3. Add web-specific perpetual license issuance/activation and server-side entitlements. Enforce rights at API and background execution boundaries, not only by hiding buttons. Define replay, duplicate activation and revocation behavior; preserve access to existing data as explicitly agreed.
4. Add activation/status UI using the current design contract and translations. No global redesign. Keep customer licenses distinct from administrator authority.
5. Verify focused security/integration tests, then lint/types/build and a test deployment. Complete account isolation and callback routing before a production cutover. No real posts without exact owner approval.

For a customer-operated instance, adapt phases 1–3 to one licensed instance rather than inventing unnecessary hosted tenancy. Preserve the same approved product/license policy.

## Acceptance criteria

- A valid customer license unlocks exactly its defined entitlements and belongs to the intended customer/workspace.
- UI modification or direct API calls cannot bypass hosted license enforcement.
- Customer A cannot list/read/write Customer B records, media, credentials, OAuth pending grants or execution state.
- Background publishing cannot execute against the wrong workspace or bypass the agreed entitlement rules.
- Existing owner records and scheduled jobs remain intact. Deployment rollback preserves the database, storage keys and original workspace identity.
- Documentation describes actual storage, license/device limitations and operating costs accurately; no claim of production readiness from frontend build alone.

## Unresolved questions

Baseline verification: the existing web production build passes (existing large-chunk warning retained); administrator authentication tests pass 4/4. These establish the existing single-owner baseline, not customer isolation or web license enforcement. No production deployment performed.

- Edition entitlements, production license issuer and commercial operating policy remain undecided.
