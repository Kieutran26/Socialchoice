# Facebook automatic scheduling verification

Date2026-10-13 Asia/Saigon. Status: implementation verified locally; deployed; confirmation UI verified; approved live publication pending.

Private queued approvals share existing publish-attempt store and Cloudflare alarm. Page/caption/ordered media/timezone/time explicitly reviewed, then queue committed. One connected Facebook Page, text/photo/video. At due time revalidate and claim atomically before I/O. Existing resumable media pipeline and confirmed-Published rules preserved. Cancel unstarted queue restores editable draft; changing schedule requires new confirmation. Legacy calendar plans remain unarmed until reviewed/approved.

55tests passed, lint/type/build/diffcheck passed. New safety tests: no queue from review only, early publish rejection, immutable queued snapshot, idempotent confirmation, cancel/no execution, legacy plans, missed15minute deadline, revoked permission, restart and re-arm, legacy plan preserved on review/failure, timezone update only on approval. Auth/origin/argument gates verified. No mocked successful Graph response or new real post.

Review identified startup reconciliation, stale unavailable labels and destructive legacy conversion; fixed. Startup always computes earliest persisted deadline even with existing alarm. Labels now neutral Scheduled/Waiting. Legacy review leaves post/jobs unchanged until confirmation. Failed unclaimed schedule explicitly instructs duplicate/review rather than claiming in-place retry. Required reviewer followup DONE; no remaining concerns. Reopening an unconfirmed legacy review retains calendar_plan status and all controls.

Provider alarms are at-least-once; durable claims prevent replayed writes. Cloudflare constructor/alarm semantics checked against https://developers.cloudflare.com/durable-objects/api/alarms/. Keep Free namespace/keys/bindings. Local Node must remain running. Publication begins at selected time; remote processing may delay visibility.

Unresolved: real approved scheduled publication and live UI verification.

Deployment: Worker e6994486-80d9-436f-b542-12d2bf03aeed, source77bc6d3/Vercel success. Private namespace/keys unchanged. Live UI exact Page427858497068282, caption,14:40 2026-10-13 Asia/Ho_Chi_Minh review shown. Test draft only; no queue confirmed or Meta post sent. Screenshot plans/261013-1353-facebook-scheduling/schedule-approval-preview.png. Owner approval requested for this one real scheduled text post.

Owner approved exact14:40 Asia/Ho_Chi_Minh test; confirmation accepted at14:25-14:26. Post6446d346-68ea-4e6f-8327-885537548d66 shows Scheduled, automatic enabled, Deszy Waiting. Settings separately showsonequeued/next14:40/oneconnected. Savedconfirmed/settingsscreenshots. Closed taskpost/settingstabs beforedue to avoid relying on browserstatuspoll. Actualpublication remains pending14:40; no secondpost/testqueued.

Additional focused test confirms ordered photo and actual stored MP4 snapshots freeze in approved future queues without remote upload. Full55tests passed. Public health200/meta configured, anonymous session401.

Live result2026-10-13 after14:40: owner reports successful publication. After tasktabsclosedbeforedue, reopened post6446d346-68ea-4e6f-8327-885537548d66 at14:41+; app confirmedPublished, DeszyhistoryPublished, realURL https://www.facebook.com/427858497068282_122224688360487033. Exactapprovedcaption retained. Screenshot schedule-published.png. No duplicate sent. Scheduledtextconfirmed through actual backend result and ownerFacebook observation; photo/video scheduled delivery not independently exercised live.

Unresolved: optional real scheduled photo/video tests require separate exact owner approval. No blocker for verified text schedule.
