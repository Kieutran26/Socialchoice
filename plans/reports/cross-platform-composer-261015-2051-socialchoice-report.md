# Cross-platform composer validation

Date: 2026-10-15 (Asia/Saigon)

Implemented: platform caption controls and inheritance, draft/edit/duplicate persistence, common preview/server caption resolver, per-account format/length/connection checks, per-account future-time checks, platform-qualified destination deduplication, account-neutral confirmation/results/cancellation labels, Vietnamese translations and owning docs.

Validation:
- `pnpm test`: 144 passed, zero failures. Includes eight new tests across content checks, loaded TikTok creator duration/permission checks and five-platform group approval/queue semantics.
- `pnpm run typecheck`: passed.
- `pnpm run lint`: passed.
- `pnpm run build`: passed. Existing large bundle warning remains (about1.16 MB before gzip).
- Browser: isolated in-memory API on dedicated fixture port3013; synthetic credentials; all outbound provider requests blocked. Verified Threads501-character issue, caption fallback/preview, platform/account captions after save/reopen, exact Facebook/Threads/LinkedIn text review, exact times in schedule review, confirmed three-account schedule and individual results, cancellation of Facebook while siblings stay queued, cancellation of remaining schedules. Mobile375px document/content widths equal, no horizontal overflow.
- Five-platform stored MP4 test verifies immutable caption/media snapshots, repeat-safe group confirmation, rollback for incompatible caption, changed-content rejection, duplicate identity rejection within a platform, independent cancellation and revoked due-time preflight. No provider success fabricated or claimed.
- Evidence: [group review](cross-platform-confirmation-261015.png).

Runtime: user's pre-existing dev processes on3001/5173 left running. The fixture on3013 (PID73932) was stopped; no fixture listener remains. Browser test tab closed and viewport override reset. No user database, credentials, deployment, Git commit or real publication changed.

Boundaries: private token/grant checks and current TikTok creator limits remain server-authoritative; the composer also checks video duration/permissions against loaded creator settings. Shared media only; no platform-specific media overrides. Local changes require rollout and owner-authorized real cross-platform testing before live success can be claimed.

Review: independent review verified caption precedence, atomic/replay-safe approval, persistence and independent account operations. Its duration-check finding was fixed by exposing loaded TikTok settings to the channel checks, with boundary/permission regression tests. Unconfigured/group-count and non-Facebook reconnect errors now use channel-neutral wording. Focused follow-up review completed with no actionable findings.

Unresolved questions: none.
