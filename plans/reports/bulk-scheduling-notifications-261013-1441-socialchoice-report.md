# Bulk scheduling and publishing notification verification

Date2026-10-13 Asia/Saigon. Status: implementation/local verification complete; final reviewer/deploy/browser pending.

Batch review supports1–50 distinct live drafts, existing connected Facebook destination per post, start/timezone and day/hour distribution, reorder/per-post override, exact Page/caption/ordered media/time review. Server freezes per-item revisions and commits all queue claims in one transaction. Invalid/changed/expired item rolls back the whole new confirmation. Confirmed batch record is historical acknowledgment; replay never revives cancellation or repeats delivery.

In-app bell derives only private failed/unknown publishing attempts, with persistent read state. SQL selects recent100 through partialtimestampindex before joining post/read metadata; unread total separately counted. ID acknowledgments are pointlookups; mark-all uses one SQL insert-select. No full JS history/post scans on visible30secondpoll. Empty/loading/error states are honest. Escape/outside dismissal, focus return and stale refresh-vs-read guards included. No email/push/paid service.

Focused7tests: invalid/duplicate/oversize prepare; second-item changed atomic rollback; expiry; confirmed replay/cancellation; actual preflight failure; persistent acknowledgment; editable log cannot forge notices; interruptedclaim unknown/no success;101 actual local preflight failures prove100bound/unread101/read-all0. Auth/origin/argument routes checked. No mocked successful Meta responses or live batch approval.

Required reviewer found scale-dependent notification scans; replaced with bounded indexed query/projection and separate count. Followup pending. Existing single scheduling/text/photo/video contracts retained.

Unresolved: browser/deploy verification, optional real batch publication requiring exact owner approval. No scheduled photo/video live test was performed per owner choice.
