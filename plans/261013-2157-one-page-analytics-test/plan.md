# One-Page live analytics verification

Outcome: read real reaction/comment/share counts on existing Deszy Page427858497068282 and verify Analytics uses legacy confirmed history. Owner authorized one-Page testing; no publication/comment/reaction/share/delete or new Page test.

Evidence: Cloudflare account/namespace verified by connector; four confirmed real publications. Production Worker version67515d3b-577f-449e-9a69-38e2d6604cac lacks current analytics table. Legacy attempts have no finishedAt, but corresponding Post records contain server-confirmed published_at. Local runtime51580 is older/unconfigured/no live Pages. Native browser controller initialization unavailable; CLI network verified with approved escalation.

Scope: cause-aligned legacy date selection fix without rewriting attempts/history; use supported Cloudflare admin read-only SQL/Meta GET route and server-owned credential handling without printing secrets. If deployment is needed for online Analytics, preserve namespace/keys and inspect prior queue state/rollback. No currently queued/processing live attempts were found (prepared2/published4).

Acceptance: exact Page and confirmed IDs only, results from real Meta reads, honest missing/denied counts, legacy dates correct, regression checks, no publishing-state change and no secret output. Record online UI/API verification separately from direct adapter read proof.

Result: real one-Page test performed; Meta explicitly requires pages_read_user_content for reaction/comment counts. Legacy date fallback and reconnect/error guidance repaired in source;80tests/type/lint/build pass. No publishing-state changes or online rollout. [Report](../reports/one-page-analytics-261013-2157-socialchoice-report.md). Owner Meta consent remains required.
