# Owner license interface delivery

Status: deployed. User requested a GUI for the administrator and explicitly accepted moving the existing signing key into backend secret storage. Work started25October; completion recorded26October2026, Asia/Saigon.

## Delivered behavior

- `/admin/licenses`, owner-only menu. Email, customer name/order label, Starter/Professional/Business, explicit purchase verification, create and download. No payment processing, pricing differences or tier limits invented.
- Encrypted web issuance history with100recent records and exact-file redownload. Same request UUID retries return the original token; altered details or another web request for the same normalized issued email fail409. Previous Windows-issued files are not automatically synchronized; no upgrade/revocation feature added.
- HTTP authentication and owner-runtime checks deny customers and unrestricted local mode. Cloudflare owner identity now exposes `storage: hosted`; UI labels it online while Node remains local. Existing role/mode contracts retained.
- Shared Ed25519 signing module preserves SCW1/Windows CLI compatibility. Backend refuses missing, invalid or public-key-mismatched issuer. History list excludes tokens; owner download returns only the selected license, never signing material.

## Deployment and custody

- Existing Worker `socialchoice-api`: active code version `380f3b48-6774-4607-9055-614c0eef2791`.
- Vercel `dpl_AuErBpFrDJJb5WKRWkG5RyCZVktB` aliased https://socialchoice.vercel.app, built from current dist in static-only `.test-tools/admin-license-release`.
- Existing private issuer provisioned using local DPAPI decryption and private Wrangler stdin to `SOCIALCHOICE_WEB_LICENSE_PRIVATE_KEY`. Only a generic success line was emitted; no key/passphrase in arguments, model output or frontend. Existing public key was preserved; no replacement issuer generated. Encrypted original remains at `D:\Socialchoice-Private\web-issuer`.
- WORKSPACE `2d292e578a9a4b65a13a43b10099294b`, CUSTOMER_DIRECTORY `a6e08bad374b474b955c11b62b2b05e5`, CUSTOMER_WORKSPACES `f3fc370eb94c4255bad59f02cb39b231` retained. Existing provider/storage/admin secrets preserved; no new migration or data transfer.

## Validation

- `pnpm test`:169/169 passed. Actual bundled Workers test proves authenticated owner issue/status/download/history, exact retry, duplicate-email denial, customer403/anonymous401, cross-origin403, signature-compatible activation and persistence after restart. Unit tests cover malformed/mismatched/missing key, invalid details, purchase confirmation and token-free list output.
- Typecheck, lint, frontend build passed; existing large-chunk warning remains. No test weakened.
- Read-only reviewer identified duplicate-email issuance and incorrect hosted-owner storage label. Both fixed with regression coverage; final review returned DONE with no remaining scoped concerns.
- Browser in disposable actual Workers runtime: owner login, form input, purchase checkbox, issuance success and download; two downloaded files (initial and history redownload) matched byte-for-byte and the intended fixture account/license. Browser download-event hooks timed out, but file-system verification confirmed both actual downloads. No product workaround was needed.
- Responsive1440/390 checked. [Wide UI proof](admin-license-proof/issued-fixture-1440.png), [mobile UI proof](admin-license-proof/issued-fixture-390.png). These screenshots use fixture data; they were captured before the hosted-owner footer label fix. Current label fix is covered by actual Worker session test and code review.
- `node scripts/web-license-live-check.mjs --enabled`: actual HTTPS index, JS/CSS, policy and TikTok verification-file hashes match dist; health/config200. Anonymous session, entity access, license status/list/issue all401. Cross-origin login403. No real customer license or post created.
- Cloudflare settings read confirms private/public issuer binding presence and unchanged namespace IDs. Production browser is signed out; no credentials read or password changed, and no production license issuance attempted.
- Owned preview process47496 on4188 was identified by its exact harness command, stopped and its disposable persistence removed. Test download files were cleaned after verification; browser viewport reset and local proof tab closed. Production admin route kept open for user sign-in.

## Operations

Owner signs in at https://socialchoice.vercel.app/admin/licenses using the existing Socialchoice password. Follow [Vietnamese guide](../../docs/huong-dan-cap-license-web.md). Send only the downloaded `.scweblicense` to the purchaser. Customer chooses their own password and saves their recovery code.

To stop web issuance, remove only the private signing-key binding; public verification of existing licenses stays active. Roll back UI/backend code compatibly, retaining all existing namespaces and encrypted issuance history. Never replace the public key, storage keys or issuer to undo a UI change.

## Unresolved questions

- Authenticated owner signing readiness and first real purchaser license on production need owner login/acceptance. Actual issuance verified only against a disposable issuer/runtime.
- Windows/profile recovery backup remains unverified. Protect the local original and the backend secret independently.
- Older Windows-issued license files are not indexed by this UI; commercial edition limits/pricing, provider approvals and revocation remain separate decisions.
