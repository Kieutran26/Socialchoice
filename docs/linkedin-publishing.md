# LinkedIn personal publishing

Socialchoice app264127536 is associated with verified NextChoice Page144000396. Owner enabled Share on LinkedIn and Sign In with LinkedIn using OpenID Connect. Only personal profiles are supported by this integration. LinkedIn requires Community Management to be the sole product on a separate app; company Page integration is deferred by owner until business email is available.

## Configuration

Server variables LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET, LINKEDIN_REDIRECT_URI and existing META_TOKEN_ENCRYPTION_KEY. Never expose them through VITE variables or commit private .env.linkedin. Local start/dev:api load .env.linkedin. Existing Cloudflare Worker holds the private values after explicit owner approval. Preserve the stable encryption key and existing platform secrets.

Exact allowed redirect: https://socialchoice.vercel.app/api/linkedin/callback. The owner approved and the portal saved this callback2026-10-15. Required scopes: openid, profile, w_member_social; email is not requested. App product availability is not a user OAuth grant. Token introspection confirms app, active3-legged grant, scopes and expiry; userinfo provides member identity. No ID-token claims are trusted without validation: this integration uses the authenticated userinfo response instead. No refresh grant is assumed; reconnect on expiry (normally about60days).

## Use

Social Accounts: choose an active real brand, Connect/reconnect LinkedIn, approve on LinkedIn, explicitly select the returned profile. Check access or disconnect from its account row. Disconnect prevents new remote requests; an already started remote request may complete. Company Page planning references do not become connected.

Create Post: choose a connected personal profile, enter1–3000 characters and optionally attach up to10 stored JPEG/PNG images or one stored MP4/H.264 video up to30MiB. The workspace upload limit for other platforms remains unchanged. LinkedIn visibility is PUBLIC and is displayed in the confirmation. Review exact account, caption, media and time; Publish Now or confirm automatic schedule. Existing per-destination captions/times and durable scheduling apply. Node runs while its server is alive; the Cloudflare alarm continues after browser closure. More than15minutes missed is failed, not silently delayed.

## Delivery and safety

Self-serve UGC API and assets register/upload/status endpoints are pinned to official hosts. Media is uploaded from private storage, without a new public media URL. Persisted claims/checkpoints prevent repeat register/upload/publish after an interrupted uncertain write. Processing reads can resume. A201 response with a valid post URN is required for Published; missing acknowledgement remains unconfirmed. Do not automatically resend. Inspect LinkedIn before duplicating an unconfirmed post. A returned permalink is derived from the acknowledged URN, not a readback claim or analytics result.

## Verification

Local OAuth cancellation/replay/session/expiry, explicit import/encryption, token response validation, HTTP auth, exact-content schedule review, text/photo checkpoints and lost-write/crash tests. Browser fixture has an in-memory database and forbids all external fetch; immediate and scheduled confirmation reached with correct profile, LinkedIn label, public visibility and reviewed text/time. This is not live LinkedIn publication proof. Existing FB/IG/Threads/TikTok regressions must pass before release.

## Sources

- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/share-on-linkedin
- https://learn.microsoft.com/en-us/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2
- https://learn.microsoft.com/en-us/linkedin/shared/authentication/token-introspection
- https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/vector-asset-api

## Rollout2026-10-15

LinkedIn personal rollout2026-10-15: reviewed Worker9e64bdd5-5eed-47d1-91f4-24eff5702b08 and Vercel dpl_9M5PGvY58V4tJXWDeeDS4D4F5qRC deployed via static-only .test-tools/linkedin-release. UI200/exact index-DCJDk-Dq.js match, health200, anonymous session/LinkedIn status401, policies and TikTok verificationfile200 verified. Existing namespace, actor, binding, migration, stable keys and other platform settings retained. Owner-approved callback saved; authenticated account screen shows LinkedIn ready and preserves Deszy+deszy_creative. Started real OAuth for active brand Test with only openid/profile/w_member_social and reached official LinkedIn sign-in; owner sign-in and grant/import pending. No real LinkedIn publication or schedule success claimed. Rollback references: previous Worker d06089b4-963d-44c5-8474-6530711cc65b and Vercel dpl_FG2vctBTwBGXK5AatbpcTXV97WLD. Retain private keys; do not restore a runner without LinkedIn support while LinkedIn jobs are queued/processing.
