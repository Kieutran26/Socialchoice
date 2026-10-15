# Instagram connection and publishing

This integration uses Instagram API with Facebook Login, alongside existing Facebook delivery. It supports a Facebook-Page-linked Instagram Business or Creator profile. Personal Instagram accounts and direct Instagram Login are not implemented. Threads, Stories, carousels, Instagram Analytics and inbox management are outside this integration.

## Owner setup

1. In Instagram, switch to a Business or Creator account if necessary. Link that professional account to the Facebook Page you manage, such as Deszy. This must be a Page linkage, not only an Accounts Center association with a personal Facebook profile.
2. In the existing Meta App, configure the Instagram API with Facebook Login use case/product and enable instagram_basic and instagram_content_publish, with pages_show_list and pages_read_engagement. Complete any access/testing requirements Meta presents. A developer/tester role is not general app approval; permission availability alone does not grant a token scope.
3. Keep the existing HTTPS callback /api/meta/callback. In Social Accounts choose Instagram, select the live brand and Connect / reconnect Instagram. Sign in only on Facebook's official domain and authorize the appropriate Page/Instagram access.
4. Select the returned Instagram profile and Connect selected Instagram accounts. If none is returned, verify Page linkage, professional account type, owner access and granted scopes. Manually entered destinations remain planning references.

Discovery is bounded and stores only selected identities. Each Instagram credential is independently encrypted and contains its linked Facebook Page ID; tokens and Page access credentials are not returned to the browser. Check Instagram access verifies the current Page linkage and profile identity. Reconnect replaces the credential and invalidates stale access checks/reviews. Disconnect leaves Facebook and history intact.

## Create and publish

Choose a connected Instagram account from the same brand. Use one stored JPEG image (4:5 through1.91:1 aspect ratio, existing3MiB upload cap) or one stored MP4/H.264 video (existing100MB upload cap), published as a Reel. Caption must contain1–2200characters. Text-only, PNG/WebP and multiple-image Instagram posts are rejected before submission. The same JPEG/video can target Facebook and Instagram together; each destination has its own caption/time/result.

The composer identifies the platform and previews the Instagram media/caption. Publish Now reviews the exact profile, caption and media. Schedule reviews the exact time/timezone and queues delivery only after confirmation. Unstarted queues may be cancelled; started operations cannot be cancelled. Existing Facebook bulk scheduling can queue individual Instagram destinations through the same reviewed flow.

Each network write is claimed in persistent private attempt history before it is sent: create media container, poll processing, publish container, verify returned media identity and Instagram permalink. Only verified publication becomes Published. Read checks may repeat within a bounded30minute window; uncertain writes are never automatically resent. If delivery is unconfirmed, inspect Instagram before creating another post. A failed read after publication cannot make the destination retryable merely because verification could not finish.

## Private media and scheduling

Instagram fetches approved media through a signed HTTPS backend capability. It expires after one hour and binds the attempt, credential and exact media snapshot; it works only while that Instagram attempt is processing and its connection remains current. It is revoked when processing ends or authorization/media changes. It contains no Meta token or session cookie. The normal library endpoints retain admin authentication. Full media and exact byte ranges stream in bounded chunks on Node and Cloudflare; no public bucket or paid storage is added.

The configured backend/public HTTPS origin is required; unauthenticated local loopback development cannot publish Instagram media because Meta cannot fetch private localhost URLs. Cloud uses SOCIALCHOICE_BACKEND_ORIGIN. Existing keys, SQLite actor identity, storage cap, alarm and scheduling reconciliation remain shared with Facebook. No new scheduler or key is provisioned.

## Verification status

The integration is deployed online2026-10-14. Final92/92server tests, lint/typecheck/build and independent review passed. Public UI build identity, API health, anonymous authentication rejection and invalid media capability rejection were verified. Isolated tests cover connection boundaries, claim/replay behavior, safe media streaming and shared Facebook regressions. Owner has reported an Instagram account that is not linked to Deszy yet. No live Instagram OAuth, import, publication or scheduled delivery is claimed until owner linkage/consent and a reviewed real test are completed. See [delivery and rollout evidence](../plans/reports/instagram-integration-261014-2039-socialchoice-report.md).

Primary references: [Meta Instagram collection](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api), [Meta IG Media SDK fields](https://github.com/facebook/facebook-nodejs-business-sdk/blob/main/src/objects/ig-media.js). Implementation uses current configured Graph version and treats actual provider responses as authoritative.

Meta setup2026-10-14: added the Instagram content/messaging use case to the existing Socialchoice App, selected Facebook Login setup and individually added instagram_basic plus instagram_content_publish. Both permission rows visibly show Ready for testing. No messaging permission, broad permission bundle, app publication, token-generation step or new owner grant was performed. Existing business_management/Page permissions were already displayed as Ready for testing. Socialchoice's current browser tab requires admin sign-in, so profile discovery/import is pending. Page linkage and account authorization remain unverified. Proof: plans/reports/instagram-meta-permissions-261014.jpg.
