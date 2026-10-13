# Facebook automatic scheduling verification

Date2026-10-13 Asia/Saigon. Status: implementation verified locally; deployment/UI/live test pending.

Private queued approvals share existing publish-attempt store and Cloudflare alarm. Page/caption/ordered media/timezone/time explicitly reviewed, then queue committed. One connected Facebook Page, text/photo/video. At due time revalidate and claim atomically before I/O. Existing resumable media pipeline and confirmed-Published rules preserved. Cancel unstarted queue restores editable draft; changing schedule requires new confirmation. Legacy calendar plans remain unarmed until reviewed/approved.

54tests passed, lint/type/build/diffcheck passed. New safety tests: no queue from review only, early publish rejection, immutable queued snapshot, idempotent confirmation, cancel/no execution, legacy plans, missed15minute deadline, revoked permission, restart and re-arm, legacy plan preserved on review/failure, timezone update only on approval. Auth/origin/argument gates verified. No mocked successful Graph response or new real post.

Review identified startup reconciliation, stale unavailable labels and destructive legacy conversion; fixed. Startup always computes earliest persisted deadline even with existing alarm. Labels now neutral Scheduled/Waiting. Legacy review leaves post/jobs unchanged until confirmation. Failed unclaimed schedule explicitly instructs duplicate/review rather than claiming in-place retry. Required reviewer followup pending.

Provider alarms are at-least-once; durable claims prevent replayed writes. Cloudflare constructor/alarm semantics checked against https://developers.cloudflare.com/durable-objects/api/alarms/. Keep Free namespace/keys/bindings. Local Node must remain running. Publication begins at selected time; remote processing may delay visibility.

Unresolved: real approved scheduled publication and live UI verification.
