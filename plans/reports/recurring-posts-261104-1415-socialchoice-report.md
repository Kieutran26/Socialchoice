# Recurring posts delivery

Implemented web post-detail controls for automatic every-14-day/monthly republication. Local timezone and anchor day retained; shorter months clamp without drift. Optional end date and successful-publication limit, explicit preview/consent, pause/stop and separate occurrence links/history.

Private series storage and source/account/media fingerprints preserve exact approval. Review rolls back temporary content/jobs; confirmation queues one occurrence atomically, replays are idempotent. Successful completion advances one future occurrence; missed periods skip, errors/unknown/cancellations pause, queued work cancels and started claims remain untouched. Existing publisher claims, per-provider preflight, license checks and Node/Cloudflare wake paths are reused. TikTok future occurrences retain frozen consent with fresh delivery-time creator validation.

Validation: 320/320 full server tests, typecheck, lint, build and whitespace checks pass. Build retains existing large bundle warning. Focused coverage includes actual due runner with isolated provider transport fixtures, snapshot changes, multi-account atomicity, DST/month-end, exact first UTC instant, missed periods/counts, restart, tenant IDs, authenticated/origin boundaries and creator-cache expiry. No real platform calls or publication performed.

Browser: disposable in-memory server PID71872, port3001. Opened sample source post, reviewed monthly/3 publications and upcoming dates, enabled with explicit checkbox, observed active schedule/history, paused and observed paused status. Screenshot `data/recurring-post-active-preview.png`. Fake fixture tokens and no-op delivery wake only in preview script; no production data/config changed. Preview stopped after verification.

Deployment: none. Online use requires frontend/backend deployment together. Local scheduling requires server uptime; hosted uses existing alarms. Resume creates a fresh reviewed series rather than replaying prior approval.

Independent review: completed. Blocked deleting active recurrence sources and added a regression. Routine account sync timestamps were already excluded from fingerprints; added explicit coverage verifying an unchanged connection check does not pause recurrence.

Unresolved questions: none.
