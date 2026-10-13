# Facebook performance analytics

Status: implemented and verified locally. Outcome: authenticated read-only synchronization of lifetime reactions/comments/shares for confirmed Facebook deliveries, durable private snapshots, date/Page/Pillar filters, totals, top publications and Page/Pillar comparison with measured coverage and timestamps. Preserve existing delivery/weekly/content-mix analytics and all prior multi-Page changes.

Constraints: one Page is sufficient, no real publishing test needed. Only server-owned confirmed attempts/IDs eligible; no external post import or manual metric entry; tokens server-only; bounded manual batches/cooldown and partial failure states; absent metrics are null, confirmed zero is zero; no paid provider/cron/deploy required. No reach/view/engagement-rate claims without validated API support and permission.

Acceptance: samples/drafts/unconfirmed outcomes excluded; real GET requests and strict count/identity parsing; existing snapshots survive failure/restart but show staleness/errors; filters and totals never multiply duplicate results; only measured rows contribute; account/brand isolation; authenticated endpoints/origin/argument tests; EN/VI responsive UI and independent review.

Evidence: official Meta developer references return429 from this environment; primary Meta SDK PagePost code confirms shares field and comments/reactions edges. API response at configured version is the runtime authority. Unavailable/deprecated fields remain missing, not zero. No claim of live metrics retrieval until verified.

Steps: private storage/selection and Graph adapter; metrics service/routes; performance UI; regression/persistence/response tests; browser fixture and review; owning docs/report.

Validation:78server tests, type/lint/build/diff and local browser filtering/error/EN/VI375/768/1440 passed. [Verification](../reports/facebook-analytics-261013-2110-socialchoice-report.md). No live Graph/online rollout claim.
