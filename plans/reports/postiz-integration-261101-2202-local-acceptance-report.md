# Postiz integration acceptance

Date: 2026-11-01 Asia/Saigon. Scope: Socialchoice web local/staging. No production deployment, native desktop migration or live publication.

## Delivered

- Opt-in server Postiz config and redacted transport failures, HTTPS/loopback URL checks, no credential redirects.
- Authenticated channel discovery, explicit brand/selection import, idempotent reimport, check and local disconnect. Provider metadata remains server-owned; private references encrypted separately.
- Existing Socialchoice composer/approval/multi-destination/scheduling pipeline selects Postiz for imported Facebook channels. Text and stored media use the adapter; native destinations retain the current path.
- Submission uses durable claims; acceptance remains processing. Exact remote/channel state plus publication ID and Facebook URL required for published state. Ambiguous creates are not resent; accepted IDs can resume polling after restart. Pre-submit failures remain retryable.
- Existing Graph analytics does not attempt to decrypt Postiz references. Postiz analytics import remains unavailable and is documented.
- No global CSS, layout, dependency or design-token changes.

## Evidence

- Actual adapter GET returned TalentChoice and NextChoice, both active; API key was transferred privately from the local Docker Prisma client to ignored `.env.local`, never logged.
- Browser on loopback port 3001 imported both into isolated `data/postiz-preview.sqlite`, brand Postiz local, and saved a NextChoice draft. No remote create/publish/schedule API called in acceptance.
- Desktop browser and 390px layout checked; no horizontal page overflow observed. The original local workspace's posts/jobs were not copied or executed.
- `node --test server/*.test.js`: 279/279 pass. Initial sandbox run failed solely on Cloudflare tool filesystem permissions; complete rerun with sufficient local rights passed.
- `pnpm run typecheck`, `pnpm run lint`, `pnpm run build`: pass. Build retains existing large-bundle warning.
- Review findings fixed: per-operation lease timestamp/ownership; retryable pre-submit errors; authorization-hook guard; disconnect during upload prevents create. Regression tests exercise all four.

## Run and rollback

See `docs/postiz-integration.md`. Temporary acceptance API: managed exec session 81396, loopback port 3001, command `node --env-file=.env.local plans/261101-2202-postiz-integration/local-preview.mjs`; stopped after verification. Docker Postiz was pre-existing and remains running. No new background daemons remain.

Set `SOCIALCHOICE_POSTIZ_ENABLED=false` and restart the local API to disable. Keep stable encryption key privately if preserving imported references. Existing production is unchanged.

Unresolved: real publication, long-lived token behavior and Postiz analytics have not been verified/implemented. The live publish test needs explicit owner authorization for exact Page/content/time. Scheduling requires the local Socialchoice server to stay running.
