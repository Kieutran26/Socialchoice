# Facebook video publishing

Outcome: one MP4/H.264 video to one authorized Facebook Page, exact caption/video review, private upload/library/preview, durable background delivery and real processing/publication confirmation. Preserve text/photos and current UI/Free hosting. No scheduler, mixed photo/video or Reels-specific workflow in this request.

Design: 64 MiB video limit, 1 MiB browser chunks into existing private SQLite media chunks; authenticated upload sessions, idempotent local chunk retries, reserved storage quota, atomic finalization and bounded byte-range preview. MP4 structure/metadata/H.264 checked before attachment. Existing 200 MiB encoded workspace quota retained. No new paid storage or broad permissions.

Meta: official Page /videos start/transfer/finish resumable protocol, graph-video.facebook.com for writes, server-only bearer/proof, persisted single-operation claims and offset validation. Finish acknowledgement alone is not Published. Poll known video ID for ready + published + matching Page identity. Read-only status checks may retry; uncertain writes are never blindly resent.

Validation: isolated real MP4/storage/auth/range/claim tests, actual Workers persistence, no mocked Meta success, UI local/live upload, review, deploy Free. Exact owner-approved video/Page/caption required before a real public test. Source references: Meta official Page/AdVideo SDK and video_uploader.py on facebook/facebook-python-business-sdk.

Review: no critical auth/storage/alarm/duplicate-write blocker. Corrected expired-reservation quota ordering and definitive Meta invalid-parameter/permission finish errors. README now owns implemented video behavior with live-test status explicit. SDK offset-error retries are intentionally not added: this accepted design retains Unknown for uncertain writes, without live evidence authorizing offset correction.

Validation: 42 tests + new quota/rejection checks; lint, typecheck and build passed. Actual generated H.264 MP4 decoded locally and stored/read through Node and bundled Cloudflare actor across runtime restart. Live Meta video publication still pending exact owner approval.

Deployment: commit e3075b0, Vercel 93znQTdjRuLLoMxD7u21KmDT2mUn Ready; Worker ecbb3c60515f48749562f73d29ff9878, existing namespace and private bindings preserved. Public video upload verified through owner session: 640x360 H.264,6 seconds, readyState4, no decoder error. Draft74b1e373-9d31-4c97-a9b9-cd3de8c0db6f saved, no publish attempt sent. Exact live video approval remains required.

Final checks:44 tests passed; lint/typecheck/build passed. Browser playback clock advanced with paused=false and no error. Live Facebook video success remains unverified; do not mark this draft Published without actual Meta confirmation.
