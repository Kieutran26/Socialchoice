# Web license revocation delivery

Status: deployed and verified,26October2026, Asia/Saigon.

## Delivered behavior

- Owner `/admin/licenses` exposes Thu hồi license with customer-specific confirmation and cancel. History retains revoked status/date; download and repeat revocation are disabled.
- Central encrypted directory denial commits before owner history. Retries preserve the first timestamp and reconcile partial history persistence failure.
- Activation, login, recovery and existing sessions are denied. Customer requests, signed media, alarms and subsequent provider graph calls check entitlement. Temporary authority failure returns503; definitive revocation403 stops the workspace alarm.
- TikTok pre-provider refresh denial preserves its original credential and releases the unconsumed local refresh claim. Provider-submitted requests may still finish.
- Customer data, history and credentials remain stored. No restore, refund, edition change, deletion or arbitrary Windows-issued license import was added.

## Evidence and verification

- `server/license-authority.js`: internal HMAC authority, bounded validity, fail-closed status response handling. Public internal route returns404.
- `server/customer-directory.js`, `server/admin-web-licenses.js`, `server/admin-license-http.js`: durable registry, session invalidation, owner-only confirmed revocation, idempotent ordering and revoked-file denial.
- `server/customer-workspace.js`, `server/cloudflare-workspace-runtime.js`, `server/licensed-graph.js`, `server/tiktok-tokens.js`: request/alarm/provider boundaries and safe preflight refresh handling.
- `src/pages/AdminLicenses.jsx`, `src/api/app-client.js`, `src/lib/locales/vi-web-license.json`: existing design components, Vietnamese confirmation/status and owner API action.
- Full backend suite:172/172pass. Typecheck, lint and production frontend build pass. Existing large-chunk warning remains.
- `server/license-revocation.test.js`:3focused tests cover directory/admin behavior, forged authority, partial persistence reconciliation, graph denial and repeated TikTok refresh denial without credential damage.
- `server/customer-runtime.test.js`: bundled actual Workers activation, multiple sessions, owner/customer/anonymous boundaries, restart persistence, recovery and unaffected-account isolation.
- Required reviewer completed with no remaining scoped concerns after TikTok refresh and malformed-authority handling fixes.
- Disposable browser fixture: cancel retains active status; confirm changes status/date and disables actions; reload preserves revocation. Checked390px and1440px. [Confirmation screenshot](license-revocation-proof/confirm-390.png), [revoked history screenshot](license-revocation-proof/revoked-1440.png).

## Production release

- Worker `socialchoice-api`: `665195a4-e33e-48d7-b4a7-66eb83dc1820`.
- Vercel `dpl_2ZSEd9hPV9fjg3MQJZFYtFW4nyot`, aliased https://socialchoice.vercel.app. Static-only ignored staging `.test-tools/license-revocation-release`; no source, customer data or secrets uploaded to frontend.
- All three existing Durable Object namespaces, issuer and other secrets preserved. No migration/key rotation.
- `scripts/web-license-live-check.mjs --enabled` passes against actual HTTPS: exact frontend/policy/verification artifact hashes, health/config200, anonymous admin revoke and other private APIs401, cross-origin login403. Direct public internal-authority request404.
- No real customer license was issued or revoked, no real provider publication performed. Authenticated production revocation remains an owner operation; isolated fixtures establish behavior without affecting customers.
- Owned loopback preview stopped and its disposable runtime database removed. Production admin tab remains available.

## Operations and limits

Only the100recent web-issued history records are exposed. Previously generated Windows license files are not automatically imported. There is no restore interface. In-flight provider requests cannot be undone. Alarm/provider-live dispatch was not directly exercised against real customer services; source guards, provider proxy tests and actual Workers request boundaries were verified.

Retain central registry and compatible enforcement on backup/rollback. Earlier Worker `380f3b48-6774-4607-9055-614c0eef2791` and Vercel `dpl_AuErBpFrDJJb5WKRWkG5RyCZVktB` are historical references; reverting backend to code that ignores the registry can restore revoked access. A code rollback does not restore data.

Owner instructions: [Hướng dẫn cấp license web](../../docs/huong-dan-cap-license-web.md). Architecture: [Hosted web licensing](../../docs/web-licensing.md).

Unresolved questions: none for requested revocation scope. Commercial provider approval and customer-launch verification remain separate existing release gates.
