# Phase A: standalone local workspace

Outcome: retain existing React pages/design, run without Base44, persist real planning data.
Constraints: preserve original source snapshot; no fake account connections or publishing; no Facebook password; no hosted deployment or production data writes.
Non-goals: Meta OAuth/publishing, cloud hosting, SaaS auth, media storage.
Acceptance: UI builds/runs; Brands/Pillars/Angles/Drafts CRUD persists across restart; enforce brand/pillar/angle associations; month/week/list calendar and UTC rescheduling; unique content counts; unavailable integrations labeled; documented setup; tests and review.

1. Audit and snapshot — complete. Original bundle in source-before-phase-a.zip. Incomplete source: components absent; main entry and ignore file contain JSON; no Git or installed dependencies.
2. Persistent API — complete. Local-only Node 24 HTTP API + SQLite, validation, transactional bulk operations and atomic plan saving, no credential entity access. Keep frontend entity calling shape for incremental migration.
3. Restore missing components — complete. Existing pages/styles retained as the UI contract. Missing components restored with Phosphor, neutral palette, existing fonts and skewed buttons.
4. Integrate and validate — complete. No automatic demo seed; publishing disabled; calendar planning labeled. Seven API tests, lint, typecheck, build pass. Browser CRUD/refresh/duplicate/edit/angle-reset/calendar month/week/list/content mix verified; fixtures removed. Independent review's unavailable-upload control finding fixed and verified. See ../reports/phase-a-validation-261012-0943-socialchoice-report.md.

Migration priorities:
- A (now): durable local planning workspace; no credentials needed.
- B1: production persistence (Postgres/Supabase), admin auth/session authorization, TLS/deploy/storage/backup. Select host before exposing app outside loopback.
- B2: server-only Meta App configuration, OAuth state/callback, real Page discovery, encrypted tokens/revoke/reconnect. Owner enters credentials through environment, never chat; app permissions/review may be required.
- B3: one authorized text publishing test; immutable execution snapshot, per-Page jobs, server scheduler, atomic claims, retry/reconciliation. Published only with confirmed platform response; test with browser closed.
- C: media workflows, multi-Page batches, performance analytics when actually available, additional official API adapters.

Rollback: stop local processes, restore selected files from source snapshot. Keep SQLite data separately. Do not overwrite originals wholesale or delete user data.
