# Socialchoice login rollout

Status: PARTIAL — service, configured Windows build and real Facebook code exchange/identity verification pass. Current grant returns zero eligible Pages; awaiting owner Page selection/access validation. Native real account import remains unverified.

## Deployed service

- Origin: https://socialchoice-login.nguyenngockieutran.workers.dev
- Worker: `socialchoice-login`; account `2e2290be67e66440324d34997c4acf8b`.
- Active version: `7f97248a-5615-409b-bf95-ec972ce5c45a`, deployed 2026-10-25. This supersedes the initial secret-provisioned version `091f4b02-c0e8-45f8-ac12-bf12aa9a06ce`.
- Owning configuration: [auth-broker/wrangler.jsonc](../../auth-broker/wrangler.jsonc). Only public origins/App IDs/version in source. Five private secret bindings provisioned directly through Wrangler stdin; no plaintext secret file created or secret values printed.
- No customer storage bindings. Observability/logpush disabled; remote settings show no tail consumers. Existing web Worker configuration unchanged.

## Verification

- Broker fixture suite: 19/19 pass. Native suite: 37/37 pass, including Meta zero-expiry import, read, reopen and expiry rejection.
- [Deployed boundary checks](../../scripts/desktop-login-rollout-check.mjs): all five configured providers pass status/no-store/no-CORS, official authorization host, exact callback, encrypted state/denial, remote redirect rejection and invalid exchange rejection. These do not prove credential validity or app approval.
- [Packaged desktop smoke](../../scripts/desktop-social-smoke.mjs) with `--configured-service`: pass at wide/narrow layouts, native service ready, enabled Connect button, unsupported-platform planning reference. Only disposable smoke records used and cleaned; no real OAuth initiated by this smoke test.
- Final normal-identifier build completed after smoke: release executable and NSIS installer, real broker origin embedded. Vite reports the existing large bundle warning; build succeeds.
- Read-only rollout review completed with no remaining defects in public config/boundary checks/smoke changes.

Artifacts:

- `src-tauri/target/release/socialchoice-desktop.exe`
- `src-tauri/target/release/bundle/nsis/Socialchoice Desktop Prototype_0.7.0_x64-setup.exe`
- [Desktop wide proof](desktop-social-login-smoke/desktop-login-service-ready-1440.png)
- [Desktop narrow proof](desktop-social-login-smoke/desktop-login-service-ready-390.png)

## Provider configuration and live attempt

- User signed into Meta App Socialchoice (`1115808334255427`). Explicit approval received before saving desktop callbacks.
- Facebook and Instagram callbacks saved and verified after page reload: `/callback/facebook`, `/callback/instagram` under the deployed origin. Existing `https://socialchoice.vercel.app/api/meta/callback` retained. HTTPS and strict redirect checks retained.
- [Saved Meta callbacks](desktop-social-login-smoke/meta-desktop-callbacks-saved.png).
- Real Facebook authorization page reached through deployed `/start`. User explicitly approved the four requested Page scopes, including `pages_manage_posts`, after automatic review required exact confirmation. No bypass attempted.
- Initial real tests exposed Workers-incompatible `redirect: error`. Provider fetches now use `manual` and reject every redirect response. See [Cloudflare Request redirect modes](https://developers.cloudflare.com/workers/runtime-apis/request/). Redirect rejection tests cover both token and identity requests.
- Facebook discovery now requests Instagram linkage only for Instagram. Meta valid zero-expiry tokens retain the zero sentinel through broker/native/storage instead of receiving a fabricated expiry. Required scope, app identity, Page task/proof and revocation checks remain in force. Unknown upstream WAF/401/403 responses do not falsely expire an account.
- Exchange failures reveal only fixed stage/reason enums, never provider messages, identities, URLs, codes, tickets or credentials.
- [Live probe](../../scripts/desktop-login-live-check.mjs) ran successfully against the active version: `{status: PASS, provider: facebook, destinationCount: 0}`. Actual code exchange and identity verification pass; zero eligible Pages means account import cannot yet be claimed.
- The owner-mediated live probe pins the approved origin, uses a temporary loopback receiver, keeps state/verifier/tokens in memory only, and closes after a result or ten-minute timeout. Its result is distinct from native desktop import/check/disconnect validation. The first probe's network was sandbox-blocked; rerun used authorized network access. Chrome displayed ERR_BLOCKED_BY_CLIENT even while the local receiver completed; success evidence is the probe output, not that browser error page.
- Facebook Edit settings shows Deszy selected, with NextChoice and TalentChoice also available. Owner asked which current Pages to authorize; no future-Page permission or arbitrary selection enabled. [Selection screen](desktop-social-login-smoke/facebook-page-selection.png).
- Threads, LinkedIn and TikTok callback registration and real grants remain unverified. Server readiness is credential presence only.

## Operational boundaries and rollback

- Use [desktop prototype setup](../../docs/desktop-prototype.md) for exact callback table/build commands. Preserve existing web callbacks; do not replace the web backend.
- For a later faulty deployment, select a previously verified version of this isolated login Worker in Cloudflare; preserve its existing private state key and provider bindings. Do not roll back the existing web API or rotate credentials as an incidental rollback.
- To disable desktop login in a local build, omit `-AuthBrokerOrigin`; the build script clears inherited broker configuration. Provider callbacks can be removed individually if rollback is requested; do not remove the web callback.
- This remains a prototype build, not a production licensing release. No production license authority generated, real posting performed, paid AI called or customer media hosted.

## Unresolved questions / owner actions

- Choose current Facebook Pages, then verify that Meta returns eligible destinations. Complete explicit native import/check/disconnect only after that succeeds.
- Register and validate remaining providers; their readiness does not establish real OAuth success.
- Provider publication/app review requirements remain separate from successful development-account login. Meta currently displays the app as unpublished.
