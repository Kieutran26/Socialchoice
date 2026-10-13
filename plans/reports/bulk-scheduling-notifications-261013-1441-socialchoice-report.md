# Bulk scheduling and publishing notification verification

Date2026-10-13 Asia/Saigon. Status: complete and deployed; browser review/empty notification center verified.

Batch review supports1–50 distinct live drafts, existing connected Facebook destination per post, start/timezone and day/hour distribution, reorder/per-post override, exact Page/caption/ordered media/time review. Server freezes per-item revisions and commits all queue claims in one transaction. Invalid/changed/expired item rolls back the whole new confirmation. Confirmed batch record is historical acknowledgment; replay never revives cancellation or repeats delivery.

In-app bell derives only private failed/unknown publishing attempts, with persistent read state. SQL selects recent100 through partialtimestampindex before joining post/read metadata; unread total separately counted. ID acknowledgments are pointlookups; mark-all uses one SQL insert-select. No full JS history/post scans on visible30secondpoll. Empty/loading/error states are honest. Escape/outside dismissal, focus return and stale refresh-vs-read guards included. No email/push/paid service.

Focused7tests: invalid/duplicate/oversize prepare; second-item changed atomic rollback; expiry; confirmed replay/cancellation; actual preflight failure; persistent acknowledgment; editable log cannot forge notices; interruptedclaim unknown/no success;101 actual local preflight failures prove100bound/unread101/read-all0. Auth/origin/argument routes checked. No mocked successful Meta responses or live batch approval.

Required reviewer found scale-dependent notification scans; replaced with bounded indexed query/projection and separate count. Followup DONE: index use verified with EXPLAIN, no remaining concerns. Existing single scheduling/text/photo/video contracts retained.

Unresolved: browser/deploy verification, optional real batch publication requiring exact owner approval. No scheduled photo/video live test was performed per owner choice.

Full62tests, lint/type/build anddiffcheck passed. Worker67515d3b-577f-449e-9a69-38e2d6604cac, sourceb11c669/VercelReady; finalmobile/localefix6cbdca3/VercelReady. Existing namespace/keys preserved, no paid resource.

Livebrowser: created two technical drafts4f4c332c-e4cf-48a3-a8cf-4d97540f999a and43035ad8-f06d-48ee-9b3e-37569652f2b4 with explicitunpublishedtitles. Selectedboth, reorderedfirst, daily distribution14/15Oct10:00, peritemsecond10:30; exactDeszyPage427858497068282/captions/times shown from realAPI review. Cancelledreview, reloadconfirmedbothDraft/unscheduled/noexecutionhistory. No batchconfirmed andno Meta post. Leftdraftsintact; selectorcleared.

Notificationslive0unread/empty is honest. Escape returnsfocus, mobilepanelleft12/right348 within375. Bulkreviewdocumentwidth375/768/1440 equalsviewport; no horizontaloverflow. Temporaryviewportreset. Screenshots localplanfolder: bulk-review-desktop/mobile/tablet/wide, notifications-desktop/mobile.

Visualcritique22/24: existingfonts/colors/hierarchy/alignment preserved, no metrics/inventedstatuses; loading/focus/dismiss/empty verified. States1: realfailureitems/readbuttons testedlocally, not provokedonlivePage. Craft1: automatedcontrast/fulltabtraversal unverified. render-check.mjs skippedunder browsercontrolconstraints; supportedCUA usedat375/768/1440.

Unresolved: none blockingrequestedfeatures. No actualbatchpublication orlivefailure was induced; suchtests require exactownerapproval andwereunnecessary for thisUI/localcontractverification.
