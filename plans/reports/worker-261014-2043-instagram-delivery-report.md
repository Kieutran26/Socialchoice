# Instagram delivery backend

Status: DONE

Added Instagram Graph container/create/status/publish/verified media path; dispatches shared approvals and schedules by durable attempt platform. Legacy untagged Facebook attempts remain Facebook-only. New jobs, variants and logs preserve platform. Facebook media runners explicitly exclude Instagram.

Instagram input: one private stored JPEG (aspect ratio 4:5–1.91:1) or MP4 Reel, caption 1–2200 chars, connected Facebook-linked professional profile, instagram_basic+instagram_content_publish and Page create-content task. Unsupported media combinations reject before claims. HTTPS config.mediaOrigin is required; root owns config and routing.

Media access: createInstagramMediaAccess(store,config).serve(req,res) handles GET/HEAD /api/instagram-media/{attemptId}/{assetId}?expires=...&signature=.... HMAC binds attempt/credential/storage/SHA/expiry; one-hour maximum; only current processing Instagram attempts and unchanged connected authorization/media snapshots. Full image/video responses and exact single byte ranges use bounded 1MiB reads through res.stream(generator) or Node Readable.pipe. No static public media or session bypass on ordinary media paths.

Remote writes claim busy/stage durably before request. Known container processing and published media verification are safe repeatable reads. Poll FINISHED before media_publish. Published requires exact returned media ID, owner profile ID and Instagram permalink. Uncertain write or post-publish authorization/identity errors remain unknown; no automatic resend or definitive retryable failure after known media_publish success.

Validation: seven Instagram tests passed; 34 focused Facebook scheduled/multi/photo/video plus Instagram tests passed before adding the seventh regression; npm lint passed. Tests use real isolated SQLite, stored format fixture, pure response parsers and interrupted durable claims; no remote success simulation or real publishing. Root handles integrated routing/stream verification, review and full final checks.

Primary references:
- https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api — Meta-maintained media creation/status/FINISHED/media_publish contract.
- https://raw.githubusercontent.com/facebook/facebook-nodejs-business-sdk/main/src/objects/ig-media.js — Meta-owned IGMedia owner/permalink fields.

Concerns: no live Meta publication or deployment verified; single-image and single-Reel scope is explicit, no carousel.
Unresolved questions: none.
