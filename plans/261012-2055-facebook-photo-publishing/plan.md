# Facebook photo publishing

Outcome: upload/private durable image library, composer selection/removal/order and exact review, one or multiple images in one real Facebook Page post. Preserve existing text publishing and UI; keep Free hosting. Video and calendar delivery remain unavailable.

Design: existing authenticated backend stores bounded image chunks in SQLite (no new paid service/public bucket). JPEG/PNG/WebP, 3 MiB each, ten images per post, 200 MiB workspace image cap. Server metadata immutable; referenced images cannot be removed. Same-origin authenticated image previews. Images sent to Meta only after post confirmation, via multipart unpublished photo uploads and final attached_media feed.

Execution: durable per-operation claims/checkpoints and Cloudflare alarms; image publication continues without browser. At-least-once alarms must never resend claimed uncertain operations. Validate every photo ID and final Page-prefixed post ID, retain uncertain history. Local Node executes same workflow while its process runs and resumes safe checkpoints after restart.

Verification: input/signature/auth/brand/storage/history tests, real Workers persistence and multipart transport, UI upload/preview/review, independent review, free deployments. Real live photo publication requires owner-selected/approved images, Page and caption; no mock success or fabricated publication.

Primary references: Meta official generated Page SDK https://raw.githubusercontent.com/facebook/facebook-python-business-sdk/main/facebook_business/adobjects/page.py (photos and attached_media), Cloudflare alarms https://developers.cloudflare.com/durable-objects/api/alarms/ and SQLite limits https://developers.cloudflare.com/durable-objects/platform/limits/ . App limits are conservative product bounds, not claimed platform maximums.
