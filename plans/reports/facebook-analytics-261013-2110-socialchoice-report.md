# Facebook analytics verification

Date: 2026-10-13 Asia/Saigon. Status: implemented and locally verified; no live metrics request or online deployment performed.

Delivered: authenticated read-only reaction/comment/share retrieval for confirmed Socialchoice Facebook publications; private persistent per-metric snapshots; UTC publication-range/Page/Pillar filters; sum/coverage cards, per-Page/Pillar comparison and50-row ranking by reactions. One Page is enough. Existing weekly, delivery and content-mix sections preserved. Samples explicitly excluded from real performance data.

Count rules: confirmed0 shown as0, absent/unsupported/denied/unsynced fields remain null/em dash. Totals sum only measured values and expose measured/eligible coverage. Counts are lifetime values for the selected publication cohort, not interactions within that date range. Failure retains previous value/success timestamp and marks stale/error; stale also means older than24hours. No reach/view/impression/engagement-rate estimates.

Storage/security: private facebook_metrics table plus indexed published-attempt lookup; only server-owned confirmed attempt IDs eligible; duplicate Page/external ID suppressed; no entity metric write, arbitrary external-ID input, token/client leak or platform write. Three candidates per refresh, three independent count-only reads each with8s timeout; persisted30s read lease and60s cooldown; authorization checked before and after awaited reads. Cached cooldown availability reloads without Graph polling. Reports bounded1000 eligible publications with an explicit limit notice and366-day range limit.

Verification: full78/78 server tests passed. Focused metrics/auth and metrics/localization passed. Typecheck, lint, production build and whitespace diff check passed after repairing Analytics load guard/error handling. Existing large build chunk warning remains. Actual Worker bundle/auth/restart test passed; backend uses the same SQLite adapter/store logic. Documentation links verified.

Tests cover zero/null/malformed counts, response identity, independent unsupported/permission fields, draft/demo/unknown/forged-job exclusion, duplicate suppression, scoped filters, hidden snapshots, bounded refresh/cooldown, stale retention, concurrent leases, mid-read authorization revocation, restart persistence, grant checks and authenticated/origin/argument routes. Successful count fixtures are synthetic contract data, not evidence of live Meta collection.

Browser: bundled Playwright/installed Edge against built app/shared real HTTP/store/metrics service at127.0.0.1:3101 with an isolated in-memory, explicitly LOCAL TEST synthetic workspace. Page was disconnected, so Refresh exercised real preflight rejection before any Graph read. Filtering, comparisons, preserved values/permission errors, cooldown, invalid-date state, brand-empty isolation, EN/VI and375/768/1440 overflow checks passed. Found/fixed hidden cached chart tooltip extending mobile document width; chart viewport now contains it. Screenshots/scripts in ../261013-2110-facebook-analytics/. Fixture PID52560 stopped; existing user server3001 untouched.

Mandatory independent review initially found undeclared loading guard, missing failure handling and stale docs/localization while edits were ongoing. Fixed and re-reviewed DONE:78tests/type/lint/build/diff passed, no evidenced concerns. Final narrow CSS/localization review DONE: no evidenced regressions; tables retain internal scrolling and mobile breakpoints remain intact.

API evidence: Meta developer reference pages returned429. Used official Meta SDK PagePost source for read surfaces; runtime response at configured version remains authority. Unsupported/missing responses remain unavailable. No credentials read/printed, no real Graph request, no posting and no paid resource were required for this local delivery.

Docs: docs/facebook-analytics.md, README.md and connection guide updated; multi-Page guide links to separate analytics. Prior multi-Page changes preserved; second-Page live test remains skipped at owner's request.

Unresolved: no implementation questions. Real metrics access and online rollout remain unverified; no real collection claimed.
