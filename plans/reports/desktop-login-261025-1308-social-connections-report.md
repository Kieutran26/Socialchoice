# Desktop social login delivery

Status: code implemented, local verification PASS; production OAuth setup pending. Scope is connecting social login, not implementing native publishing or deploying the broker.

## Behavior and evidence

| Area | Result | Evidence |
|---|---|---|
| Browser login | PASS | `src-tauri/src/social_service.rs:34`, `social_loopback.rs:18`: default browser, random IPv4 loopback port, strict host/path/state, PKCE handoff, bounded callback/timeouts, cancellation and single pending selection. |
| Provider verification | PASS with isolated contracts | `auth-broker/worker.mjs:140`, `verify-grant.mjs`, `check-grant.mjs`: identity/app/scopes/expiry checks for Facebook Pages, linked Instagram, Threads, LinkedIn profiles and TikTok sandbox. No App Secret in desktop. |
| Explicit account selection | PASS | `src-tauri/src/social_service.rs:55`, `social_accounts.rs:13`: only returned account IDs, same live brand, max30 unique selections; no generic forged Connected state. |
| Local credentials | PASS | `src-tauri/src/social_vault.rs:14`: current-user DPAPI, separate per-account files, atomic persistence, no token/proof in renderer account metadata. |
| Check/reconnect/disconnect | PASS | `social_service.rs:72`, `social_accounts.rs:33`: current identity/access verification; confirmed invalid grant marks Expired. Generic service/network/401 pages preserve state. Credential-ID guards prevent reactivation after disconnect/reconnect. |
| Portable backup | PASS | `social_accounts.rs:72`, `backup.rs`, `backup_validation.rs`: sanitized disconnected references only; no credential IDs, tokens, proof, expiry or scope grants restored. |
| Existing UI | PASS | `src/components/accounts/add-channel-dialog.jsx:88`, `desktop-connection-card.jsx`: same dialog/layout/primitives, localized states, cancel, selection. Unsupported OAuth platforms retain editable planning references. |
| Trust/configuration | PASS | `scripts/desktop.ps1:8`: explicit HTTPS AuthBrokerOrigin compiled into native code; omitted origin shows Setup required; renderer cannot choose network/credential endpoints. |
| Live provider connection | NOT VERIFIED | No production broker deployment, provider secret setup, app approval or real authorization performed. |

Meta access checks require array scopes, app identity, required permissions and bounded integer expiry. TikTok access checks include the read-only creator-info endpoint requiring video.publish; profile access alone is insufficient. Instagram imports as a profile, Facebook as a page. Cancellation clears pending credentials under the same mutex used by import. Browser/network waits do not hold the SQLite mutex.

## Verification

- Native Rust: **36/36** passed, temporary SQLite/DPAPI directories; real loopback HTTP callback and invalid-grant response-contract tests.
- Broker contracts: **14/14** passed. Bridge/native IPC contracts: **4/4** passed.
- Web and desktop TypeScript checks and lint passed. `git diff --check` passed.
- Web build, desktop smoke build and final normal desktop/NSIS build passed. Existing large JS chunk warning remains; no error or suppression.
- Wrangler final dry-run: **26.92 KiB**, no bindings; no deployment.
- Independent source review: **DONE** after fixing current scopes, Instagram type, planning references, expired-state classification, cancellation race and malformed inspection data.
- Packaged UI smoke: **PASS** at1440x900 and390x844; setup state blocks live connection, unsupported YouTube Fix opens the planning-reference form, no horizontal document overflow. Smoke identifier checked natively before creating data; only its own temporary account/brand removed. Owned process closed, debug port1421 clear.
- Screenshots: [wide](desktop-social-login-smoke/desktop-login-1440.png), [narrow](desktop-social-login-smoke/desktop-login-390.png). They show the deliberately unconfigured service state, not a live grant.
- Dependency repair: sandbox install stalled; its verified owned process was stopped, frozen offline restore found four missing cached packages, then frozen online restore completed with four downloads. Package manifests and lockfiles unchanged. No skill script failure.

Normal build artifacts: `D:/Socialchoice/src-tauri/target/release/socialchoice-desktop.exe` and `D:/Socialchoice/src-tauri/target/release/bundle/nsis/Socialchoice Desktop Prototype_0.7.0_x64-setup.exe`. Prototype version retained; neither is a configured commercial release. The final executable uses the normal prototype identifier; smoke build was not left as the final runnable output. Installer execution/upgrade/uninstall were not tested.

## Setup and limits

Deploy the isolated Worker only after configuring its actual PUBLIC_ORIGIN, private BROKER_STATE_KEY and provider App credentials/registered redirects. Build desktop with that exact public origin via `-AuthBrokerOrigin`. Follow [desktop setup](../../docs/desktop-prototype.md#social-account-sign-in) and root README. Never paste App Secrets in chat or put them in VITE variables.

Current login uses provider-confirmed token expiry; reconnect when expired. Automatic refresh, customer media-storage configuration and native immediate/scheduled publishing remain separate work. The approved customer-owned media-storage decision is unchanged. No customer content/media is sent to this broker; tokens transit only during login/access verification and are not persisted there. Cloud hosting infrastructure handling is distinct from application persistence. No real post/message/paid AI call was made.

Provider references checked: [LinkedIn introspection](https://learn.microsoft.com/en-us/linkedin/shared/authentication/token-introspection), [TikTok scopes](https://developers.tiktok.com/docs/en/tiktok-api-scopes), [TikTok Direct Post setup](https://developers.tiktok.com/docs/en/content-posting-api-get-started), [official Meta Threads collection](https://www.postman.com/meta/threads/collection/dht3nzz/threads-api).

Unresolved: actual broker hostname/deployment, owner provider credentials/redirect registrations/app permissions and owner-authorized real OAuth checks. Production licensing authority/tier policy remain prior owner decisions; unchanged by this task.
