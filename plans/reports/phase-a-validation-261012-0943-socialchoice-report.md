# Phase A verification

Date: 2026-10-12 (Asia/Saigon). Project: D:\Socialchoice.

## Delivered

- Original supplied source preserved in plans/261012-0943-phase-a/source-before-phase-a.zip. No Git repository existed, so no commit/diff/history was available. No hosted Base44 data changed.
- Restored React entry, valid ignore file, native Vite alias/proxy, correct Tailwind OKLCH colors and missing surface/status colors. Removed active Base44 packages/plugin/client boot/font/favicon requests.
- Added missing components to existing screens: sidebar/navigation, Radix controls, forms, overview, composer, posts, month/week/list calendar and strategy. Existing page markup and design CSS retained. Dormant auth source kept as reference; hosted auth is unavailable.
- Own Node 24 loopback API and SQLite persistence. Owned entity schemas, server timestamps/IDs, validation, transactional bulk changes, owner-local context, host/origin/header protections, credential entity exclusion.
- Brand CRUD/archiving/restoration, Pillar/Angle CRUD/archiving, brand and pillar relationships, demo/live isolation and deletion safeguards. Referenced records cannot be moved between brands or deleted.
- Draft create/edit/duplicate/delete, multiple destination selection; atomic calendar plan save/reschedule, per-destination planning rows, UTC storage. Destination references stay unconnected; client cannot manufacture live connected/published records.
- Content mix counts unique posts by default; filters and optional per-destination-plan counts. Status filters make included content states explicit.
- Demo mode opt-in only, separate records and visible simulation banner. No automatic seeding on boot. Publishing button disabled and no fake success response. Storage/upload explicitly unavailable.
- README and .env.example document setup, data/backup, process cleanup, local-only boundary, migration and unavailable integrations.

## Evidence

- npm install completed; package-lock.json created. Installed React 18.3.1, Vite 8.3.4, React plugin 6.1.2, Tailwind 3.4.19, Phosphor 2.1.10.
- npm ls @base44/sdk @base44/vite-plugin: empty; active src/config/manifest scan found no @base44 import, Base44 hosted asset URL or Builder+ claim. Compatibility file names/comments and original base44/ schemas remain.
- npm test: 7 passed. Covers restart persistence, relationship/archive safety, real platform state rejection/credential exclusion, unique counts/array filters/literal search/pagination, bulk rollback/UTC timestamps, HTTP origin/header/error boundaries, atomic per-destination planning/reschedule/cancel/draft deletion.
- npm run lint: passed. npm run typecheck: passed without disabling checkJs or using ts-nocheck. npm run build: passed. Vite reports a large bundle warning (~924kB before gzip); not a build error. Performance splitting is lower priority migration work.
- Browser: local overview opens without Base44 auth; brand creation; pillar creation with target 60%; child angle; destination reference stays Configuration required; draft save with strategy/destination; refresh retains content; reschedule to 2026-10-20 09:00 Asia/Ho_Chi_Minh (2026-10-20T02:00:00Z); month/week/list show same plan; unique content mix 1 post/100% actual; duplicate remains draft; edit persists; changing pillar to Unassigned clears/disables angle.
- Browser: explicit sample workspace loads 3 demo brands/27 sample posts; banner states simulation/no external publishing. Real workspace remains distinct.
- Screenshot: phase-a-calendar-verification.jpg shows list calendar at tested time with Planned — publishing unavailable label. Verification/sample records created by this run were removed afterward; the final workspace is empty.

## Limitations and blockers

- Phase A is a local-only personal workspace. It has no hosted authentication and is not a production publicly accessible service. API bound only to 127.0.0.1.
- Calendar planning persists when browser/server closes; scheduled delivery is not implemented. The scheduler, locked execution snapshots, atomic worker claims, bounded retries and reconciliation belong to Phase B.
- No actual Meta OAuth, Page discovery, token storage, publishing, external status confirmation or Meta approval tests performed. No Facebook password requested.
- Media upload/storage and real engagement metrics unavailable. Analytics currently describes owned planning data; sample results are explicitly simulation.
- Existing remote Mona Sans/Google fonts still require network or fall back to system sans. Neutral palette, icon family and primary font selections retained; missing original components prevent exact pixel comparison to an earlier runnable app.
- No credentials or user approvals required for this local phase. Future public deployment needs provider selection; Phase B needs owner environment configuration, callback domain, permitted Page and applicable Meta approval.

Independent review: one concrete finding — enabled media upload could throw and stay busy while storage is unconfigured. Fixed by disabling upload controls and replacing unavailable upload execution with a configuration notice; lint/typecheck/build passed again. Browser confirms disabled upload and storage-required notice. No other must-fix findings remained in security, schema integrity, draft CRUD or calendar workflows.

Process cleanup: test frontend PID 12412 (5173) and API PID 63108 (3001), both in D:\Socialchoice, stopped after verification. Final port check shows neither listening. Temporary browser tab closed. Dependency-install cache and obsolete intermediate typecheck logs removed; final check output retained in phase-a-final-checks.log. Installed dependencies, source snapshot and verification screenshot retained.

Unresolved questions: public deployment/database provider and Meta App/domain/test Page for Phase B. No unresolved credentials for Phase A.
