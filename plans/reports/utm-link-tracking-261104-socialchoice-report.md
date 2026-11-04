# UTM and link tracking delivery

Implemented web composer preview/apply for UTM campaign tags and optional fixed tracked redirects. Effective captions resolve per account without replacing unrelated destination settings. Signed URLs and existing tracking links are skipped. Applying does not save/publish a post automatically.

Tracking records and aggregate UTC activity days persist in workspace SQLite. Management remains authenticated; public redirects route by immutable workspace/link IDs without cookies, licensing checks or publishing reconciliation. No visitor IP/cookie/user-agent persistence. Disable returns 410. Last 100 links and 30 activity days are exposed per brand.

Validation: final full server suite 310/310; focused tracking/admin suite 8/8; subsequent tracking suite 4/4 after campaign metadata correction. Typecheck, lint, build and whitespace check pass. Build retains existing large-bundle warning.

Browser: isolated in-memory server on port 3001, PID 59876. Created a tracked caption, refreshed statistics, sent one GET without following the destination, refreshed and observed count 1 and daily statistics. Screenshot `data/utm-link-tracking-preview.png`. No real posts, credentials or production data used. Preview stopped after verification.

Deployment: none. Frontend/backend must be deployed together for online use. UTM attribution requires analytics on the destination website; no GA4 report import is included.

Independent review: one P2 corrected. Existing tracking URLs are recognized only on the configured app origin and exact route; other websites with a similar pathname still receive tags/tracking. Regression covered by the focused test suite.

Unresolved questions: none.
