# Recurring posts

Outcome: explicitly review/enable automatic reposting every 14 days or calendar month, with local timezone, optional end date/run limit, pause/stop and occurrence history.

Constraints: web runtime; reuse existing publishing validation, durable claims and workspace alarms. Never retry an uncertain/failed occurrence automatically, never catch up with a burst. Source/account/media changes require a fresh review. Preserve existing UI; no production deployment or real social posts.

Acceptance: review has no draft/schedule side effects; confirmation atomically creates one approved occurrence; worker/startup continues the sequence after successful delivery only; pause/stop cancels queued work, cannot revoke started deliveries; monthly dates clamp without anchor drift; isolation, consent and crash/replay tests pass.

Implementation: calendar helper and private series store; scheduler/publisher integration; authenticated endpoints and post detail controls; focused/full checks, browser verification and independent review.

Status: complete. Independent findings resolved with source deletion guard and timestamp-exclusion regression. Browser enable/pause verified on isolated in-memory data; no deployment or live social publication.
