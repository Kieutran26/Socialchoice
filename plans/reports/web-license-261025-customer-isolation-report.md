# Web account licensing delivery — 2026-10-25

Status: implementation verified locally; customer production activation not deployed.

## Delivered

- One perpetual SCW1 license per email account, multiple independent device sessions. Signed product/email/edition validation and duplicate activation protection: `server/web-license.js`, `server/customer-directory.js:56`, `scripts/web-license-owner.mjs`. No production issuer or paid customer license generated.
- Separate encrypted directory and customer SQLite actors with authenticated routing. Legacy owner actor retained: `server/cloudflare-worker.js:15`. Private customer media, entities, OAuth state and credentials use their own workspace runtime.
- Background license enforcement: `server/customer-workspace.js:27`, `server/customer-workspace.js:35`. No real publishing performed.
- Registration/recovery return one-time recovery codes without waiting for workspace availability: `server/customer-gateway.js:38`. Bootstrap retries on later requests. Recovery revokes previous central sessions: `server/customer-directory.js:78`. Logout does not depend on workspace availability: `server/customer-gateway.js:43`.
- Existing UI reused for sign-in, activation, recovery, license status and sign-out. Correct online storage description; unchanged global design tokens. Desktop sources and prior work retained.

## Validation

- `pnpm test`: 168/168 passed, including actual bundled Worker/SQLite Durable Objects in isolated Miniflare. `server/customer-runtime.test.js:15` demonstrates two customers cannot read/update each other's records or fetch private media, cannot import each other's OAuth callback, persist independently after restart, and preserve the original owner data. It also verifies multiple sessions, individual logout, recovery revocation and forged contexts.
- `server/customer-gateway.test.js:7`: fault injection proves account recovery code delivery survives unavailable workspace and bootstrap retries. `server/customer-gateway.test.js:31`: unavailable workspace cannot prevent central logout.
- `server/web-license.test.js:58`: rotated anonymous emails cannot bypass IP throttling or block a different IP. Signed public media succeeds with cross-site platform headers; invalid signatures remain rejected in `server/instagram-http.test.js`.
- Typecheck, lint and production frontend build passed. Existing large bundle warning remains; no check was suppressed.
- Read-only reviewer verified the three initial concerns resolved. Its additional logout outage finding was fixed and covered by a regression test.
- Browser verified real fixture login, account/license settings and logout at 1440px and responsive layout at390px. [Settings desktop](web-license-proof/customer-settings-1440.png), [settings mobile](web-license-proof/customer-settings-390.png), [signed-out view](web-license-proof/customer-sign-out-1440.png). Activation form was inspected; registration/recovery submissions were verified through backend tests. No browser password changes performed.
- Browser used a disposable real Workers runtime via loopback test bridge; only that bridge removed Secure from synthetic cookies for HTTP transport. Production cookies remain Secure. This does not establish deployed HTTPS behavior. Preview process stopped, temporary fixture persistence removed, viewport reset.

## Remaining release work

Owner-controlled encrypted issuer creation/backup and public-key provisioning, matching Worker/frontend release and real HTTPS acceptance are required before opening customer registration. Current public privacy/terms need review for hosted customer data. Meta commercial App review and eligible Page access remain unresolved; other real provider grants are unverified. Edition pricing/feature differences are not invented. Revocation administration and issuer rotation are not implemented. Hosting quotas, backup/retention operations and operating costs need a commercial operating policy.

See [operating instructions](../../docs/web-licensing.md). No claim of production availability or commercial provider readiness.
