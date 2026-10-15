# Threads connection and publishing

Threads uses a separate OAuth client, app secret and user access token. A connected Facebook Page or Instagram account does not automatically connect Threads. The integration supports text or one stored JPEG/MP4, reviewed immediate delivery and confirmed automatic scheduling. It does not implement carousels, replies, Insights, search, deletion or sharing Threads to Instagram.

## Setup

The existing Meta App now has the Access Threads API use case. threads_basic and threads_content_publish visibly show Ready for testing; this is permission availability, not account consent or Advanced Access. The saved redirect is https://socialchoice.vercel.app/api/threads/callback. Threads product App ID is1880622033307199, distinct from the main Meta App ID. Use the Threads product secret from that use case's Settings; do not use the Facebook or Instagram App Secret.

Server-only values: THREADS_APP_ID, THREADS_APP_SECRET, THREADS_REDIRECT_URI. The existing stable META_TOKEN_ENCRYPTION_KEY encrypts Threads credentials; preserve it. No additional encryption key or public storage is needed. These values must never enter VITE variables, Git or chat.

Owner private local setup: npm run setup:threads prompts for the product ID/callback and uses a hidden secret prompt, then saves ignored .env.threads without overwriting an existing file or changing the encryption key. Local start/dev scripts load that file after .env.meta. For local loopback OAuth, choose the corresponding http://127.0.0.1:3001/api/threads/callback and register it in Meta; photo/video delivery still requires a public HTTPS backend that Meta can reach.

For the existing cloud deployment, wrangler.jsonc owns the public Threads ID/callback. npm run setup:threads:cloudflare uploads only THREADS_APP_SECRET through stdin to the existing Worker after authorized Wrangler login; it rejects mismatched ID/callback and does not overwrite other private keys. Enabling a scope in Meta does not authorize this upload or account access automatically.

## Connect

In Social Accounts, select Threads and the live brand, then Connect / reconnect Threads. Authorize the intended profile on the official Threads login domain. The server checks the actual token app/profile/scopes/expiry and returns one safe profile for explicit selection/import. Only a verified imported profile becomes Connected. Manual destination entries remain planning references. Existing Facebook/Instagram credentials are independent.

State and cookie nonce are bound to the admin session and ten-minute flow. Callback state is consumed once; logout, expiry or a newer flow invalidates stale results. Pending tokens and imported credentials remain server-only and encrypted. Check Threads access verifies identity and expiration; reconnect replaces credentials and invalidates stale reviews/checks. Disconnect removes local delivery access, preserving history; remote OAuth revocation is not claimed. Expired tokens require reconnect; automatic token refresh is not implemented.

## Publish and schedule

Use a caption of1–500characters and optionally one stored JPEG or MP4/H.264. Existing upload caps apply (3MiB JPEG,100MB MP4). PNG/WebP, multiple-media carousels and text attachments are not supported in this release. The exact selected profile/caption/media/time is reviewed before confirmation. Facebook, Instagram and Threads may share a post when its content satisfies every selected platform; destination captions/times and outcomes remain independent.

The shared durable backend claims each Threads container-create and publish write before network I/O, polls documented container status, then verifies the returned media ID, owner and Threads permalink. Only verified publication is Published. Status reads recover within a bounded30minute window; uncertain writes are never replayed. Verification failure after a publish acknowledgement remains unconfirmed, not retryable failure. Inspect Threads before duplicating an uncertain attempt.

Automatic schedules use the existing persistent alarm and remain active when the browser closes. Queued/unstarted destination jobs can be cancelled independently; started deliveries cannot be cancelled. Original Facebook attempts without a platform marker remain Facebook. Threads attempts never enter Facebook/Instagram upload runners.

Rollback to older code requires no queued or processing Threads attempt: cancel unstarted Threads schedules and allow started delivery to finish/become terminal first. Older media runners may not recognize Threads isolation. Preserve database/history, namespace and encryption keys; a code rollback does not roll back stored data.

Media uses the existing signed backend capability endpoint with a distinct Threads signature. It expires after one hour and requires the approved processing attempt, exact stored asset, current account/credential/scopes and unexpired token. Normal media-library routes remain authenticated. Full media, HEAD and byte ranges stream in bounded reads; no bucket or paid provider is added. Instagram signatures are retained for compatibility.

## Verification boundaries

Local contract/state/security tests are not proof of live Threads token exchange or publication. Meta use case, permission availability and callback were verified in the dashboard; on 2026-10-15 the owner authorized reading the product secret and saving it to the existing Cloudflare Worker. The private stdin upload of THREADS_APP_SECRET succeeded; other keys were preserved. No real Threads grant, account import, publication or schedule execution is claimed. The Socialchoice admin session expired; owner sign-in is required before authenticated readiness and OAuth verification. Subsequent account consent and reviewed live content still require owner authorization.

Primary API reference: [Meta Threads collection](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api). Graph requests are pinned to graph.threads.net; token endpoints use their documented unversioned paths and resource requests v1.0.
