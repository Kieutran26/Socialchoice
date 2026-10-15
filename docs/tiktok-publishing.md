# TikTok sandbox connection and video publishing

This release connects an explicitly selected TikTok sandbox profile using separate Login Kit credentials. It reviews one stored MP4/H.264 video, supports immediate posting or confirmed automatic schedules, and preserves Facebook/Instagram/Threads. The deployment remains a private single-admin workspace. No production TikTok audit or public posting approval is claimed.

## Setup

Use the Socialchoice Test sandbox, not production credentials. Server-only TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET were owner-authorized and uploaded privately to the existing Cloudflare Worker. TIKTOK_REDIRECT_URI is https://socialchoice.vercel.app/api/tiktok/callback. The existing META_TOKEN_ENCRYPTION_KEY encrypts credentials; preserve this stable key. Local scripts additionally load ignored .env.tiktok. TikTok web callbacks must be HTTPS, so local-only loopback OAuth is not claimed.

Portal app7696631987075729428, sandbox7696674250572908565 has Login Kit and Content Posting API/Direct Post configured. The integration requests only user.info.basic and video.publish; it does not request video.upload, video.list, analytics or broad profile permissions. Target user ktrn046 is verified in the sandbox list. That allowlist entry alone is not a Socialchoice OAuth import.

TikTok verified https://socialchoice.vercel.app/ as a URL prefix. Keep public/tiktokwMohPCinmk03ELeCvvrFBAVX8vV1nd9d.txt in all frontend releases. TikTok media URLs use that verified app origin and the existing Vercel API proxy to private backend storage. The separate backend origin is not covered by this prefix; do not switch TikTok media to it without another verification.

## Account access

Under Social Accounts, choose the brand in Connect TikTok sandbox. The official TikTok authorization page shows the requested access. After authorization, explicitly select the returned profile to import. Server-only encrypted tokens, session/nonce-bound state, one-use callback and ten-minute pending selection protect the flow. A newer flow/logout invalidates old asynchronous callbacks. Only the verified returned profile becomes Connected.

Check access confirms profile identity. Disconnect removes local delivery credentials where unreferenced; it does not delete existing TikTok content or claim remote token revocation. Users can revoke access in TikTok itself. Reconnect preserves independent platform history.

Access tokens are short-lived. Before creator checks or delivery, the backend refreshes tokens near expiry and stores rotated refresh tokens encrypted. A durable refresh claim prevents repeated rotation after a lost response. Reconnect is required if refresh becomes unconfirmed or expires. Concurrent in-process refresh callers share one operation; stale responses cannot resurrect a disconnected/replaced credential.

## Reviewed video and schedules

Select one stored MP4/H.264, up to the existing100MB upload cap, within the latest creator duration limit. Caption is required by the shared composer and is limited to2200UTF-16 code units. No photos, carousel, text-only posts, third-party paid partnerships or public visibility are enabled here.

Selecting a TikTok destination queries current creator information and displays nickname/username, duration limit and supported settings. Click Refresh TikTok settings after an expired review. Privacy has no default: manually choose Only me. Comment/Duet/Stitch start off and are disabled if the creator disallows them. Review own-brand commercial disclosure and AI-generated labeling explicitly. Private paid partnership content is prohibited, so that option stays disabled. Confirm the Music Usage Confirmation before publication. This checkbox does not authorize the assistant to accept legal terms on the owner's behalf.

The exact destination/caption/video/privacy/interactions/disclosure/AI settings are retained in the approval. Confirm automatic schedule reviews time/timezone and keeps running on the existing backend alarm when the browser closes. Fresh creator/identity checks run again at execution; changed limits/permissions fail safely rather than silently changing the selected options. Cancel only an unstarted schedule. Existing multi-destination confirmation and per-destination results apply.

The backend claims init durably before contacting TikTok, then polls the known publish_id. Uncertain init operations are never resent. Bounded status reads can resume after interruption; revoked/unknown results after init remain unconfirmed and cannot be retried as a definitive failure. Check TikTok before duplicating an unconfirmed delivery.

PUBLISH_COMPLETE is TikTok's direct-post acknowledgement. Private sandbox posts have no public post ID/permalink; store the provider publish_id reference without inventing a public URL. Processing may take minutes; the current read-recovery window is30minutes, after which the result is unconfirmed.

Signed media reads use a distinct TikTok HMAC prefix, expire after one hour, and require the current connected credential and exact active approved attempt/asset snapshot. GET/HEAD and bounded byte ranges are supported. Existing Instagram signatures are preserved. No public bucket or paid service is added.

## Verification and rollback

Synthetic contract tests cover config/token parsing, scopes, OAuth nonce/session/replay/import, refresh serialization/lost response, consent/options/duration, durable init uncertainty, status completion/revocation, schedule revalidation and signed media isolation. These are not proof of live TikTok token exchange or video publication.

Before rolling back to code without TikTok, ensure there are no queued/processing TikTok jobs. Preserve SQLite namespace, actor identity, media and stable keys. Code rollback does not roll back data. Keep policies and the website verification file deployed.

Live connection and reviewed real video/schedule tests remain pending owner account consent. No live publication is claimed until verified.

Primary references: [Login Kit](https://developers.tiktok.com/docs/en/login-kit-web), [token management](https://developers.tiktok.com/docs/en/oauth-user-access-token-management), [creator information](https://developers.tiktok.com/docs/en/content-posting-api-reference-query-creator-info), [direct post](https://developers.tiktok.com/docs/en/content-posting-api-reference-direct-post), [status](https://developers.tiktok.com/docs/en/content-posting-api-reference-get-video-status), [sharing guidelines](https://developers.tiktok.com/docs/en/content-sharing-guidelines).
