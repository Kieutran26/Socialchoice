# Hosted web licensing

Vietnamese owner instructions: [Hướng dẫn cấp license web](huong-dan-cap-license-web.md).

Accepted policy: a perpetual license activates one email account, usable on multiple devices. Socialchoice operates the hosted storage. SCW1 web licenses and machine-bound SC2 desktop licenses are different products. Starter, Professional and Business currently share features; no commercial feature limits or prices have been chosen.

## Runtime and isolation

The Cloudflare Worker keeps the existing `WORKSPACE` actor named `single-admin-workspace`. `CUSTOMER_DIRECTORY` stores encrypted accounts, license ownership, session hashes and recovery hashes. `CUSTOMER_WORKSPACES` creates an independent SQLite actor for each customer UUID. The gateway selects that UUID from a verified session and signs an internal context; request headers cannot select private customer data. Background runners verify the stored license before running. Existing provider permissions, publishing confirmations and uncertain-result safeguards still apply.

Customer cookies are HttpOnly, Secure, SameSite=Lax, with an eight-hour absolute lifetime. Multiple device sessions coexist. Sign-out revokes that device; recovery rotates the password and recovery code and revokes all previous central sessions. Requests already in flight may complete. Recovery codes are shown once after activation/recovery; there is no email password-reset delivery. Losing both password and recovery code has no implemented self-service recovery route. Account operations return their recovery code before workspace initialization; a failed initialization is retried on the next request.

OAuth uses the existing shared provider App, customer session and OAuth nonce/state. Public media paths include the workspace UUID and require the existing expiring, asset-bound signed capability. Private media stays authenticated. Managed media storage supersedes the earlier desktop-only customer-storage decision for this web runtime. The local Node server remains owner-only; use the actual isolated Workers tests for customer development.

## Owner issuance

On Windows run `pnpm run license:web:owner` from the project. Choose setup once, then issue for each verified purchase. The wrapper `scripts/web-license-owner.ps1` defaults to `D:\Socialchoice-Private\web-issuer`, outside source. It restricts the key directory to the current Windows user, creates an encrypted private key and protects its random passphrase with current-user DPAPI. It refuses to replace an existing issuer or license file. Never initialize a Windows production issuer through the direct Node command: POSIX file modes do not establish a Windows DACL.

Use `-Action Init -KeyDirectory <new-outside-directory>` or `-Action Issue -Email <email> -Licensee <label> -Edition starter|professional|business -OutputPath <new-file.scweblicense> -PurchaseConfirmed` for explicit noninteractive operation. The menu asks for purchase confirmation; this is an operator decision, not payment verification. No private key or passphrase is printed. DPAPI files require the original Windows profile; copying them to a different computer is not a portable backup. Maintain a full recoverable system/profile backup before relying on the issuer commercially. Do not delete that profile or rotate the issuer to fix a lost backup.

The low-level Node issuer remains available for tooling using an explicitly protected key directory and privately supplied `SOCIALCHOICE_ISSUER_PASSPHRASE`; it does not configure Windows access controls. Never put the passphrase in chat, arguments, source or logs. The Windows wrapper restores the previous transient environment value after each call.

Send the license file privately to its purchaser. The customer enters its exact email, a password of 15–256 characters and the license at activation. The server checks issuer signature, exact web product, email and unique license ownership. A second account cannot reuse that license. The private signing key never belongs on Cloudflare, Vercel or the customer device.

## Release gate

1. Owner creates and backs up the encrypted production issuer privately. Configure its public hex key as `SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY` on the existing Worker. Preserve storage and provider encryption keys; replacing those keys can lose access to encrypted state. Changing issuer public keys invalidates existing licenses; rotation and revocation administration are not implemented.
2. Review the current public privacy/terms pages for managed customer storage before customer launch. Finish provider App review and actual grant testing separately. Existing Meta test returned no eligible Pages; commercial connection readiness is not established.
3. Run `pnpm test`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`. Deploy the existing named Worker with the appended SQLite migration, then the matching Vercel frontend. Preserve all existing bindings and actor identities. Never delete customer namespaces during rollback.
4. Verify customer config, owner access, two isolated licensed accounts, OAuth callback routing, recovery and signed media on the actual HTTPS deployment. No live post is implied by activation testing. Keep activation closed until these pass. Hosting usage and data retention remain operational responsibilities; perpetual purchase does not make hosting free or unlimited.

## Deployed state — 25 October 2026

Owner explicitly requested setup and deployment. The production issuer was created at `D:\Socialchoice-Private\web-issuer` with owner-only DACL and current-user DPAPI protection. Its public key alone was configured on `socialchoice-api`; no private issuer material was uploaded. No real customer license or purchase was fabricated. Owner must keep a recoverable Windows/profile backup; an independent recovery backup has not been verified.

The web UI at https://socialchoice.vercel.app is Vercel deployment `dpl_6r3dz17FGFxhPg3VfAMBix1PFSLm`. Active Worker version after public-key provisioning is `55b9b884-0946-4740-880b-23a545cf0eae`; the owner namespace remains `2d292e578a9a4b65a13a43b10099294b`. `node scripts/web-license-live-check.mjs --enabled` verifies actual HTTPS config, exact asset/policy/verification-file hashes, anonymous data denial and cross-origin login denial. Invalid-license denial was verified once during rollout; repeat only with explicit `--probe-invalid-license`, which consumes a registration IP throttle attempt (five attempts per15minutes). Routine checks do not write account throttle state. Browser sign-in, activation and owner-login views were verified on the actual domain. A successful licensed customer enrollment and authenticated owner content check remain unverified on production; their isolated real Workers tests pass.

Use `pnpm run test:license:web` on the normal Windows profile for issuance/isolation tests. An isolated sandbox profile cannot use the owner's DPAPI; do not weaken encryption to bypass that restriction. Public privacy/terms descriptions now reflect account-bound licensing and managed customer storage; they are not a claim of commercial legal review. Provider approvals and commercial sales policy remain separate.

If activation must close, remove only `SOCIALCHOICE_WEB_LICENSE_PUBLIC_KEY`; do not rotate storage keys or delete namespaces. The original owner login remains available. Customer namespace migration prevents a direct Cloudflare rollback to a version predating those classes: deploy repaired compatible code retaining all three exports and bindings. Code rollback does not roll back stored data. See [rollout evidence](../plans/reports/web-license-rollout-261025-2032-socialchoice-report.md).
