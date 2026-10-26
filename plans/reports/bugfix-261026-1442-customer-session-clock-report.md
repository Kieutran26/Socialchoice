# Customer session clock validation fix

Status: deployed26October2026, Asia/Saigon.

## Evidence and diagnosis

User reported frequent customer sign-out. After user-assisted login, the actual licensed customer in the in-app browser showed License verification unavailable; retry succeeded. Settings then intermittently showed absent secondary account details before settling. Chrome was separately signed out; testing proceeded on the authenticated in-app customer tab without reading passwords/cookies.

`server/customer-context.js` and `server/license-authority.js` required signed future timestamps to fit precisely within the receiver clock's30second/8hour upper bounds. Deterministic tests reproduced401and503with the receiver just1ms behind. Cloudflare [documents Date.now as advancing with I/O](https://developers.cloudflare.com/workers/runtime-apis/performance/), so exact equality between actor clock observations is not a safe contract. This proves a failure mode consistent with the incident; a production internal clock delta was not measured, so unrelated future session loss is not ruled out.

## Change and security boundary

Only future upper bounds now permit5seconds of clock difference. A message/session at or before its signed expiry still fails; no grace after expiry. HMAC signatures, identity checks, stored session equality, central license revocation and8hour absolute session policy are unchanged. No keys, cookies, user credentials, customer data or frontend UI changed.

## Validation

- Before fix:2new regression tests fail with valid signed messages and1ms receiver skew.
- After fix:175/175backend tests pass, including actual bundled Workers isolation/restart and revocation. Timing tests cover1/1000/5000ms differences,5001ms rejection, expired context/session and forged signatures/messages.
- Typecheck and lint pass. Required independent reviewer DONE, no remaining scoped concerns. Actual Worker bundle built by runtime test and deployment; frontend build unchanged/not rerun.
- Production authenticated customer retained session across3consecutive Settings reloads and navigation through All Posts, Content Calendar and Settings. Account/license details remain visible. No account creation/recovery/revocation, real post or customer content mutation performed. [Screenshot](customer-session-clock-proof/production.png).
- Production anonymous health/config200, session/admin-history401 after release.

## Deployment and limits

Existing Worker `socialchoice-api`, version `6c766241-20ba-45e3-88ae-7770ea0c6fc0`, deployed with keep-vars. Existing three Durable Object bindings, stable keys and persistent storage retained; no migration. Frontend deployment unchanged. Previous version `8383cb0a-78a8-4343-8361-044f1c9db605` is code rollback reference; it can reintroduce the timing failure. Never remove revocation registry enforcement or stored data during rollback.

No background preview or live-tail process started. Timing tests are deterministic and actual Workers integration is local; production verification is a short manual navigation/reload check, not an8hour soak test.

Unresolved questions: whether other independent causes contributed to earlier sign-outs remains unproven; investigate a fresh failing request if symptoms recur.
