# Socialchoice web license rollout — 25 October 2026

Status: deployed; actual HTTPS boundaries pass. Production customer enrollment and authenticated owner content acceptance remain unverified.

## Released

- Web: https://socialchoice.vercel.app — Vercel `dpl_6r3dz17FGFxhPg3VfAMBix1PFSLm`, alias confirmed READY. Prior frontend URL: `https://socialchoice-6ryzktee3-nguyenngockieutran-3710s-projects.vercel.app`.
- Backend: existing Worker `socialchoice-api`, account `2e2290be67e66440324d34997c4acf8b`. First compatible code version `2a0713fe-90ae-444b-ab7a-6268b372949e`; public-key setup produced active version `55b9b884-0946-4740-880b-23a545cf0eae`, deployment `44a59331-122f-4b1e-bf10-79046fe5a511` at13:47UTC /20:47Vietnam.
- Original WORKSPACE namespace retained: `2d292e578a9a4b65a13a43b10099294b`. Added CUSTOMER_DIRECTORY `a6e08bad374b474b955c11b62b2b05e5` and CUSTOMER_WORKSPACES `f3fc370eb94c4255bad59f02cb39b231`. Existing owner actor name and all existing secret bindings retained. No storage/provider key rotation, data migration, purchase or real publishing.
- Separate web issuer initialized at `D:\Socialchoice-Private\web-issuer`, outside source. Encrypted PEM with random passphrase, current-user-only DACL and Windows DPAPI. Cloudflare received only the public verification key. No customer license was issued under the production issuer. Owner must maintain recoverable Windows/profile backup; off-device recovery has not been proven.
- `pnpm run license:web:owner` provides the Windows setup/issuance menu. It refuses existing issuer directories, unconfirmed purchases and existing license output. Desktop issuer and machine-bound licenses remain separate. The file `scripts/web-license-owner.ps1` owns Windows permissions; direct Node init must not be used for Windows production setup.
- Public privacy/terms descriptions updated for managed per-account storage, session/recovery data and account-bound licenses. No pricing, refunds, feature limits or service guarantee invented; no third-party terms accepted.

## Verification

- Existing backend suite168/168 passed before release, including real Workers isolation/persistence and logout-outage regression. This rollout did not change backend behavior further.
- Added real Windows owner test1/1 passes: encrypted issuer, current-user-only file DACL, no replacement, confirmed purchase required, successful SCW1 signature verification, exclusive output and no token in stdout. Initial sandbox run could not use DPAPI; rerun under normal Windows user via approved escalation passed. Explicit module import and trimmed DPAPI text fixed actual Windows compatibility issues discovered during testing.
- Typecheck, lint and frontend build pass; existing large-chunk warning remains. Worker dry run passes. Reviewer requested routing Windows setup through wrapper; docs updated and ACL regression added.
- `node scripts/web-license-live-check.mjs` passed with activation disabled before public-key setup. `node scripts/web-license-live-check.mjs --enabled` then passed with ready=true, multipleDevices=true and purchase=one-time.
- Actual HTTPS checks: index, JS, CSS, privacy, terms and exact TikTok verification-file hashes match local artifacts. Health200; anonymous session401; anonymous entity list401; invalid license registration403; cross-origin login403. No valid account creation/purchase was fabricated for these probes.
- Browser on actual domain: customer sign-in at1440px, license activation at390px, existing owner sign-in form retained. [Live sign-in](web-license-proof/live-sign-in-1440.png), [live mobile activation](web-license-proof/live-activation-390.png). No password entered or changed, no authenticated customer/owner content proof claimed. Viewport reset; live owner-login tab kept open for user acceptance.
- Final reviewer found routine invalid-license probes consume registration IP throttling. That probe is now explicit `--probe-invalid-license`; normal deployment checks are non-mutating at the account-directory boundary. One invalid-license attempt during rollout remains valid evidence; no customer account was created. Historical Meta status text was clarified against the latest grant, which returned no eligible Pages.
- Deployment staging contained only static dist output, equivalent API/SPA routes and project identity. No source, local databases, private issuer or diagnostic files uploaded. No dev servers started.

## Operations and rollback

See [web licensing](../../docs/web-licensing.md). Keep all three Durable Object exports and namespaces on subsequent deployments. A class migration prevents direct rollback to pre-migration Worker version `9e64bdd5-5eed-47d1-91f4-24eff5702b08`; deploy compatible repair code instead. Disabling only the web public-key binding closes customer mode while preserving owner access and storage. Never delete namespaces or replace storage keys to roll back UI/code.

Current issuer is protected by the owner's Windows profile. A copied folder alone cannot recover DPAPI on a different machine. Do not remove that profile without a tested recovery backup. Private key must never be published; public key remains a server binding preserved by future deploys.

## Unresolved questions

- First real licensed customer activation, independent devices and recovery on production; destructive acceptance covered only in isolated Workers runtime so far.
- Existing owner contents authenticated check: owner login form remains available, namespace unchanged; user must sign in to verify their records.
- Independent issuer/profile recovery backup, commercial edition/pricing policy and provider commercial approvals. Meta eligible Page access remains unresolved. No real posts tested.
