# Owner customer license tracking

Status: deployed and verified26October2026, Asia/Saigon.

## Delivered

- Owner recent-license history shows activation state/date and last successful sign-in, alongside edition, issuance and revocation. Email/name/order-label search combines with license and activation filters; explicit refresh retrieves current state. Scoped to the100recent web-issued records already exposed.
- Encrypted directory accounts record activation date on registration and latest sign-in on successful session creation, including activation/recovery. Failed/revoked attempts do not advance it. Existing dates remain unknown; no historical backfill invented.
- Bounded internal signed batch returns metadata only. Owner list awaits authority; errors fail visibly rather than producing false pending state. Existing owner/customer/anonymous access rules preserved.
- New issuance refreshes authoritative metadata. Result download uses server checks instead of trusting cached token after revocation. Revocation retains customer metadata in the displayed row.
- Existing design primitives/localization retained; history gets full canvas width through stacked page panels, with contained table overflow. No recovery override, tier limits or global redesign.

## Verification

-173/173backend tests pass, including actual bundled Workers isolation/restart/owner-only metadata and pending-to-activated history. Focused5/5tests cover issuance, revocation and new tracking behavior.
- `server/customer-license-tracking.test.js` verifies registration/login/recovery timestamps, legacy null activation date, failed/revoked attempts, persistence, missing/bad authority and absence of secrets in history.
- Typecheck, lint and production build pass. Existing large-chunk warning remains. Latest frontend `index-Cv5Vw6_h.js`, `index-D6P1dOKF.css`.
- Required reviewer DONE after fixing newly-issued metadata refresh and cached result download checks; no remaining scoped concerns.
- Actual Workers-backed disposable UI: pending, activated and revoked fixtures; case-insensitive trimmed email search, combined filters, no-match state and explicit refresh verified. Desktop/default and390px mobile layout checked. [Desktop fixture](customer-license-tracking-proof/desktop.png), [mobile fixture](customer-license-tracking-proof/mobile.png).
- Authenticated production owner page and explicit refresh verified read-only; new search/filter/activation columns visible. [Production screenshot](customer-license-tracking-proof/production.png). No real customer activation, issuance, recovery, revocation or provider action performed.
- Actual HTTPS live check passes: exact assets/policies/verification file hashes, health/config200, anonymous history/admin/private APIs401, cross-origin login403.

## Release and operations

- Worker `socialchoice-api`: `8383cb0a-78a8-4343-8361-044f1c9db605`.
- Vercel `dpl_BsigqNfoXMiGH4yzvBv9mNaDgs6o`, ready and aliased https://socialchoice.vercel.app. Only frontend dist plus existing routes/project identity staged under ignored `.test-tools/customer-license-tracking-release`.
- Existing namespaces, keys/secrets and data retained; no schema migration. Previous revocation release Worker `665195a4-e33e-48d7-b4a7-66eb83dc1820` and Vercel `dpl_2ZSEd9hPV9fjg3MQJZFYtFW4nyot` are compatible references. Preserve central revocation enforcement and stored data. Tracking-unaware older code may omit timestamps when rewriting accounts; prefer repaired current code.
- Preview PID74528/session63521 on loopback4188 stopped; disposable runtime removed. Production admin tab remains open.

Limits: no online-presence signal; manual refresh only. Historical missing dates cannot be reconstructed. Windows-issued files remain outside web history. Customer provider setup/commercial approvals are separate from activation. Account recovery using missing password and missing recovery code remains unimplemented as stated in the opening scope.

[Owner guide](../../docs/huong-dan-cap-license-web.md), [architecture](../../docs/web-licensing.md).

Unresolved questions: none for tracking/search scope; safe owner-assisted recovery requires a separately accepted identity-verification workflow.
