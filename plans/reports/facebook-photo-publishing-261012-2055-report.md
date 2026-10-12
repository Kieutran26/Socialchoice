# Facebook photo publishing

Implemented: private JPEG/PNG/still WebP uploads, bounded durable image chunks, media library selection, reorder/removal, image previews, immutable exact Page/caption/image approval, background photo upload checkpoints and final attached_media feed publication. One Facebook Page, up to ten images, 3 MiB each, 40 megapixels, 200 MiB encoded storage cap. Text posts preserved. Video/calendar delivery unavailable.

Safety verified: authenticated same-origin previews, server-owned immutable file metadata, brand/demo isolation, referenced-file deletion guards, operation claim before each remote call, at-most-once uncertain operations despite repeated alarms, startup/missing-alarm reconciliation, terminal status cannot be downgraded by stale results. A valid late final acknowledgement may resolve unknown to Published. No platform success generated locally or mocked.

Validation: 38 tests passed including Node upload/read and actual Workers SQLite image persistence across restart; full lint, typecheck and production build pass. Existing bundle-size warning remains. Independent reviewer verified corrections for terminal settlement, alarm recovery and media order; remaining concern is real Meta multipart/attached_media verification.

Deployment: source commit d204c11, Vercel 5VNgYktVCW1AhzCo24GDQDhYbUAR Ready, Cloudflare 0e0d35f200e0411580044bc896388d41. Same Free Worker/SQLite namespace/secrets; no paid service or new permissions provisioned. Public same-origin health reports text_photo_publish_now with admin-session and configured Meta.

Live UI: two generated non-sensitive technical test PNGs (green/gray) uploaded privately, previews rendered, order changed/restored, draft saved/reopened, image detached and selected again from library. Draft f5d4d2d4-4784-4356-bca1-9207427919fc; review accepted Page Deszy 427858497068282 with exact ordered images. Local screenshot facebook-photo-review-261012.png. No file sent to Facebook yet.

Unresolved: specific owner approval to publish the reviewed technical test caption and both images, then real Facebook response/post verification. No live photo publication claim until that succeeds.
