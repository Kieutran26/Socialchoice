# Socialchoice

## Autopilot Phase 1 (feature branch)

Drive/R2 metadata ingestion, an asset catalog, and reviewed image analysis are behind `SOCIALCHOICE_AUTOPILOT_ENABLED`. The flag is off by default. See [configuration, limits, recovery, and acceptance gates](docs/autopilot-phase-1.md). No production configuration or deployment is included.

## Current product direction

The owner selected a hosted web app with managed customer storage on2026-10-25, retaining one-time license sales. One license belongs to one account and supports multiple devices. The deployed Cloudflare implementation adds signed SCW1 web licenses, customer authentication and separate customer workspaces while retaining the original owner workspace. Starter/Professional/Business currently identify editions with the same features; pricing and differentiated limits remain undecided. The owner-approved backend signing key and account verification are configured. The owner can issue and download licenses at https://socialchoice.vercel.app/admin/licenses; the protected Windows issuer remains available as backup. Actual HTTPS boundary checks pass; first licensed customer enrollment remains unverified in production. See [web licensing and operating instructions](docs/web-licensing.md). Desktop sources and data remain available; desktop SC2 licenses are separate.

## Desktop login broker

`auth-broker/worker.mjs` is a separate stateless OAuth broker for the Windows desktop migration. It has no storage bindings and does not handle customer content/media. Browser authorization uses encrypted expiring state and handoff tickets; the native client redeems a handoff with its SHA256 proof. Tokens are returned only in the HTTPS exchange response. Tickets contain provider authorization codes, never access/refresh tokens; provider code consumption prevents successful repeated exchange. No service-side session or replay database is introduced.

Configure `PUBLIC_ORIGIN` as the exact HTTPS broker origin and `BROKER_STATE_KEY` as a private 32-byte hex encryption key. Provider variables use `META`, `THREADS`, `LINKEDIN`, or `TIKTOK` prefixes with `_CLIENT_ID` / `_CLIENT_SECRET`; Meta additionally needs `META_GRAPH_VERSION`. Register `/callback/facebook`, `/callback/instagram`, `/callback/threads`, `/callback/linkedin`, or `/callback/tiktok` under that origin in the corresponding provider app. Provision secrets privately; never put them in frontend variables or the desktop installer. `auth-broker/wrangler.jsonc` disables Worker logs, traces and Logpush and defines no data storage. Infrastructure-level request handling remains subject to the hosting provider.

Run `pnpm run test:auth-broker` for isolated contract tests. Desktop Social Accounts now opens the default browser, validates a single pending loopback/state/PKCE handoff, verifies provider app identity/scopes/profile and offers explicit destination selection. Only selected accounts are imported; credentials are protected with Windows DPAPI, excluded from renderer reads and portable backups. Reconnect, current-access check and local disconnect use the native connection service. Restored account references are disconnected and require sign-in. Tokens expire according to provider evidence; automatic token refresh is not included in this login change.

The separate login service was deployed on2026-10-25 at `https://socialchoice-login.nguyenngockieutran.workers.dev`; `/status` and deployed boundary checks pass. Private provider secrets were provisioned from existing local setup without changing the web backend. Meta desktop callbacks are saved and real Facebook code exchange/identity verification passes; the current grant returns zero eligible Pages, so Page access and native import remain unresolved. Other providers' real grants remain unverified. Readiness alone proves neither App approval nor a real grant. See the [rollout evidence](plans/reports/login-rollout-261025-1445-socialchoice-report.md).

Build with `pnpm run desktop:build -- -AuthBrokerOrigin https://socialchoice-login.nguyenngockieutran.workers.dev` (or pass that parameter directly to `scripts/desktop.ps1`). The address is public, exact HTTPS origin without trailing slash; App Secrets remain broker secrets. Without this explicit build parameter, Social Accounts displays Setup required. See [desktop configuration and callback routes](docs/desktop-prototype.md#social-account-sign-in).

The owner selected customer-configured media storage for platforms requiring public media URLs; developer-hosted media storage is outside this design. Actual native publication remains separate work. The web-runtime integration sections below describe the existing web application, not completed desktop publishing capabilities.

Standalone local content planning workspace. React/Vite frontend plus an owned Node/SQLite backend. The existing page layout, neutral palette, Mona Sans/Space Grotesk typography, Phosphor icons and flat near-black primary buttons follow the button design contract. The supplied source had missing components and a broken entry file; Phase A restores them without replacing the existing page designs.

UI source of truth: [Design system and AI implementation contract](docs/design-system.md). Read it before changing the interface; it documents current tokens, components, responsive behavior and the checklist for preventing visual drift.

## Windows desktop prototype

The `desktop/tauri-prototype` branch adds a Tauri 2 + native SQLite application. Version0.7 supports brands, pillars/angles, content strategy, draft create/edit/duplicate/delete and local calendar plans with month/week/list, drag, reschedule and cancellation. Calendar plans need no connected account and never publish automatically. Desktop data never uses the existing web database or cloud API; v0.1 prototype brands are retained. Local JPEG/PNG/still WebP and MP4/H.264 media can be imported, previewed and attached to drafts. Settings exports portable workspace backups and validates/recovers before transactional restore. Optional BYOK writing supports OpenAI/Gemini with Windows-protected keys and preview-before-apply suggestions. Offline license activation binds every commercial license to one computer when an issuer key is configured; additional computers need separate licenses. Customers can export activation requests; a local Windows owner menu handles explicit policy, issuance/reissue and commercial builds. The default prototype remains unrestricted. Edition limits/prices and real publishing remain later work. See [desktop setup, verification and rollback](docs/desktop-prototype.md). Existing web commands below remain available.

## Run locally

Prerequisite: Node.js 24 or newer, pnpm. No Base44 account, Deno, cloud credentials or paid connector required locally.

```powershell
cd D:\Socialchoice
pnpm install --frozen-lockfile
```

Start two terminals in the project folder:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

Open http://127.0.0.1:5173. The API binds to 127.0.0.1:3001. Vite proxies /api to it and fails if its configured port is occupied. Stop both terminals with Ctrl+C when finished; don't start duplicate servers on other ports.

Create a brand under Settings, then its pillars and angles. Add destination references under Social Accounts to plan for multiple Pages. References remain Configuration required; they are not OAuth connections. Save drafts from Create Post; edit/duplicate from All Posts. Calendar plans appear in month/week/list views and can be rescheduled.

## Interface language / Ngôn ngữ giao diện

Open Settings → Language and choose English or Tiếng Việt. The interface changes immediately; the choice is saved in this browser and survives refresh. New browsers start in English. In Vietnamese: Cài đặt → Ngôn ngữ → Tiếng Việt.

Navigation, forms, dialogs, notifications, filters, statuses, calendar and analytics labels are localized. Date/number display follows the chosen language; stored UTC timestamps, status keys, brand/post names and captions are unchanged. Native browser date-picker controls may follow the browser/OS language. No translation service or credentials are required.

Optional server configuration is listed in .env.example. For overrides, copy it to .env.local and set matching API/frontend ports in both terminals. The API script reads .env.local; Vite loads it for its config. No secret values belong in VITE_* variables or Git. The default timezone is Asia/Ho_Chi_Minh and scheduled timestamps are stored in UTC.

## Interactive screenshots

Open Content > Interactive images (`/interactive-images`). Choose a PNG, JPEG or WebP screenshot up to 5 MB / 40 megapixels. Drag over the image to create up to 20 numbered regions, or use Add region and edit percentage coordinates with the keyboard. Enter a title and annotation for each region, then select Preview interactions. Hover/focus shows the annotation; clicking a marker spotlights its region and dims the rest. Click the dimmed image, click the marker again or press Escape to clear the highlight. Coordinates scale with the image on smaller screens.

This editor runs entirely in the browser tab and does not upload screenshots. Download interactive HTML to keep or share the result; the downloaded file includes its image and works offline. Leaving/reloading the editor discards the current work, and choosing another image resets annotations. HTML is an interactive viewing export, not an editable project or a static social-platform image.

## Data and backup

Persistent data: data/socialchoice.sqlite. Refreshing or restarting the server preserves it. Data and .env files are ignored by Git. With the API stopped cleanly, copy the data folder to a safe backup location. Restore that folder only while the API is stopped. Do not remove it to fix frontend problems. Tests use separate temporary/in-memory databases.

The original source snapshot is plans/261012-0943-phase-a/source-before-phase-a.zip. The original base44/ configuration and schemas remain for reference, but the standalone runtime does not read them or contact Base44. Its owned schemas are in server/entity-schemas.json. No existing hosted Base44 records have been exported, changed or migrated automatically.

## Implemented in Phase A

- Persistent Brands, Pillars, Angles, drafts/posts and calendar plans.
- Brand/pillar/angle and demo/live relationship validation on the server.
- Draft creation/editing/duplication/deletion and multiple destination selection.
- Atomic plan save with destination rows; rescheduling in UTC and Vietnam display time.
- Calendar month/week/list, content filters, unique content mix vs pillar targets, optional destination-plan counts.
- Archive used strategy records instead of deleting history; reject unsafe parent moves/deletes.
- Explicit unconfigured integrations; server rejects manually forged live connected/published states.
- Real data by default. Optional sample workspace is isolated and visibly labeled simulation.

## Admin sign-in and standalone server

Run `npm run setup:admin` to enter a new Socialchoice password locally, then `npm run build` and `npm start`. Open http://127.0.0.1:3001. This serves the built UI and API from one Node process. Setup creates an ignored `.env.admin` containing a password hash; never paste passwords into chat. Sessions protect workspace data, expire after eight hours and are revoked by Sign out or server restart. Development remains loopback-only when no hash is configured.

See [admin server setup](docs/admin-server-setup.md) for local password recovery and backups, and [online deployment](docs/online-deployment.md) for the authenticated Cloudflare backend.

## Facebook Page connection

Meta OAuth, API Page discovery, selected Page import, encrypted server-only tokens, reconnect, access check and local disconnect are implemented. Run `npm run setup:meta` to configure your Meta App locally (hidden App Secret prompt), restart the app, then connect under Social Accounts. This requires an admin session and authorized Page access. Local configuration does not imply Meta approval or a verified live connection. See [Facebook connection setup](docs/facebook-connection-setup.md). Publish Now supports text, up to ten stored images, or one stored MP4/H.264 video to 1–30 different connected Facebook Pages within the same brand with pages_manage_posts and a content-creation task. It shows the exact Page/caption for confirmation, preserves one durable attempt and only records Published after a valid Page post ID, or a ready, published video with matching Page identity. Automatic scheduling is available after exact Page/content/time confirmation; see [scheduling](docs/facebook-scheduling.md).

## Online deployment preparation

The Vercel UI domain is `https://socialchoice.vercel.app`. Its free Cloudflare backend is deployed at `https://socialchoice-api.nguyenngockieutran.workers.dev`; health and anonymous access rejection are verified. `wrangler.jsonc` owns configuration; shared logic preserves local Node operation. `pnpm run setup:cloudflare` provisions private values after authorized Wrangler login. See [online deployment](docs/online-deployment.md) for persistence, cutover and rollback. Real Meta OAuth, Page discovery and owner-approved text publication have been verified. The owner reports successful photo publication. An owner-approved video publication was independently verified on Facebook on 2026-10-13.

## Not implemented yet

Reach/view metrics and automatic resend of uncertain delivery are unavailable. Facebook reaction/comment/share synchronization is implemented locally; see analytics below. Old calendar plans stay planning-only until explicitly confirmed for automatic delivery. Sample published records are simulation only.

The API defaults to loopback locally. Hosted Node binding requires the configured admin password, exact HTTPS origin and persistent database path. The Cloudflare adapter requires private admin and encryption secrets and stores data in its SQLite actor. Vercel routes same-origin requests to the verified backend. Do not expose the unauthenticated development mode.

Phase B needs owner-provided Meta App configuration in server environment variables and an authorized test Page. Never provide a Facebook password to this app or paste secrets into chat. OAuth must happen on Meta's official domain. No claim of approval, connection or successful publishing will be made without a real API test.

## Validation

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

npm run preview is a frontend build preview only; it does not configure the API proxy. Use the development pair above for functional Phase A checks. Build output is dist/. Publishing/deploying is a separate future task; no automatic Git/Base44 sync is used.

Audit: plans/reports/project-audit-261012-0943-socialchoice-report.md
Plan: plans/261012-0943-phase-a/plan.md
Validation: plans/reports/phase-a-validation-261012-0943-socialchoice-report.md
Product/design contract: SOCIALCHOICE_PROJECT_GUIDE.md

## Private images and photo posts

Upload JPEG, PNG or still WebP in Create Post or Media Library after choosing a live brand. Each file is limited to 3 MiB and 40 megapixels; a post supports up to ten images. Select library images and arrange their order in the composer. The confirmation dialog shows the exact caption, Page and images. A single MP4/H.264 video can be selected instead of images.

Images are stored as private bounded SQLite chunks in the existing backend, with a 200 MiB cap on encoded image storage. Image previews require the admin session; no public bucket or paid storage is enabled. Remove unused images from Media Library; referenced images preserve post/history integrity. Uploading into Socialchoice does not publish on Facebook.

After confirmation, Cloudflare alarms upload each photo unpublished and create one final feed post with the returned photo IDs. Claims and checkpoints prevent replay of uncertain operations, and the cloud process continues if the browser closes. Node local mode runs while its server process is alive and resumes only safe checkpoints after restart. Photo upload IDs alone never mark the post Published; the final Page post ID is required.

## Private video uploads and publication

Select one MP4/H.264 video up to 100 MB, with a caption and one connected Facebook Page. Uploads use authenticated 1 MiB requests, private SQLite chunks and bounded byte-range previews. Images and videos share the 200 MiB encoded workspace cap; incomplete upload reservations expire after one hour and are cleaned on later media requests. No paid storage is required. Video format checks inspect bounded MP4 metadata; Facebook remains the authority for actual decoding and publication.

The confirmation dialog shows the exact Page, caption and video. After approval, durable start/transfer/finish checkpoints run in the background. Video finalization alone does not mark Published: the server checks the known video ID for ready, published and matching Page identity. Read-only status checks may repeat safely for up to 30 minutes; uncertain write operations are not resent. Check Facebook before creating another post when the result is unconfirmed. This is Page video publication; no Reels-specific editing is provided. Automatic scheduling uses the same reviewed Page video delivery.

The local 6-second H.264 fixture in server/fixtures/socialchoice-test-video.mp4 is generated technical test content without audio. Storage, access and persistence tests alone do not prove live Meta publication. The separately approved real video test is recorded in plans/reports/facebook-video-publishing-261013-0941-socialchoice-report.md. See [video implementation record](plans/261013-0901-facebook-video-publishing/plan.md).

## Composer preview

Create Post uses a 30/70 editor/preview split on wide screens and stacks below 800px available canvas. Facebook-style preview shows the selected Page, expandable caption, ordered photo mosaics, image inspection and native video playback. Final Facebook layout/cropping may differ by device.

Facebook collaboration was removed at owner request after a real approved invitation was rejected on 2026-10-13. No success or acceptance is claimed. Private attempt history is retained; authenticated collaboration endpoints are disabled. Normal text/photo/video publishing remains available. See [preview details](docs/composer-preview.md).

## Bulk schedules and publishing notifications

Select live drafts in All Posts to distribute and review a batch of up to50 scheduled posts. Confirmation is atomic and cannot replay remote writes. The header bell retains real failed/unconfirmed publishing notifications and read state. No paid provider is added. See [bulk scheduling](docs/facebook-scheduling.md) and [notifications](docs/publishing-notifications.md).

## Multi-Page Facebook publication

Select up to 30 connected Facebook Pages from the same live brand in Create Post. Use a shared caption/media or set a caption and publishing time per Page. Preview switches between Pages. Publish Now reviews every Page/caption/media; Schedule reviews every Page/time and confirms the entire group atomically. Queued Page jobs use the existing persistent alarm and continue with the browser closed.

Post details show each Page's result, caption, time and confirmed Facebook link. Cancel an unstarted Page independently or cancel all remaining queued Pages. A post stays locked while any execution or approved queue exists. Published requires all current destination results to be confirmed; partial outcomes retain per-Page history. Retry is a fresh reviewed confirmation for one definitive failed Page only; published, processing, queued and unconfirmed destinations cannot be retried. No automatic resend is added.

Existing single-Page posts and bulk scheduling of separate single-Page drafts remain supported. Multi-Page posts are scheduled through their composer. Local migration preserves old approval IDs/history, queued jobs and notification state; cloud and local adapters share it. See [multi-Page operations](docs/facebook-multi-page.md). This change is verified locally, including browser checks with an isolated in-memory fixture; no live multi-Page publication or online deployment is claimed.

## Facebook performance analytics

Analytics now supports server-only manual retrieval of lifetime reaction/comment/share counts for confirmed Facebook deliveries. Select publication dates/Page/Pillar, refresh up to three publications, inspect per-metric timestamps/availability, compare Pages/Pillars and rank publications by reactions. One connected Page is enough. Counts absent from Meta stay unavailable; confirmed zero remains zero. Failed refresh preserves clearly marked previous data. Reach/views and engagement rates are not inferred.

Private snapshots/read leases persist in the existing SQLite backend and cannot be forged through entity APIs. No new paid service or background Meta polling is added. Existing delivery/weekly/content-mix statistics remain available. See [Facebook analytics](docs/facebook-analytics.md) for filters, coverage, permissions, limits and verification status. No live metrics retrieval or online deployment is claimed for this local change.

One-Page analytics check2026-10-13 reached the real Deszy Page and verified its token, but Meta explicitly required pages_read_user_content for reactions/comments. Source reconnect now requests this scope; owner authorization and rollout remain necessary. The legacy publication-date fallback preserves older confirmed posts without rewriting their history. No successful counter retrieval is claimed.

Rollout2026-10-13: the reviewed multi-Page/Analytics build and permission fixes are now deployed to the existing Cloudflare backend and Vercel UI. Production UI bytes match the local build; health200 and anonymous session401 are verified. Meta permission enablement, owner reauthorization and Deszy reimport still require owner interaction; counter access remains unverified. See [rollout record](plans/reports/analytics-rollout-261013-socialchoice-report.md).

## Instagram

Instagram integration uses Facebook Login to discover and explicitly connect a Page-linked Business/Creator account. Create Post supports one stored JPEG photo or one MP4 Reel, with a reviewed caption/profile, immediate publication or confirmed automatic schedule. Each destination keeps durable independent results; uncertain writes are not resent. Approved media is served through expiring signed backend links while the library remains private. See [Instagram setup and publishing](docs/instagram-publishing.md) for owner linkage, app permissions, supported formats and verification boundaries. No live Instagram success is claimed yet.

## Threads

Threads has its own OAuth, product credentials and verified user token. Connect under Social Accounts, review text or one stored JPEG/MP4 and publish now or confirm an automatic schedule. Threads keeps independent durable results and uses signed private media; uncertain writes are not resent. Existing Facebook/Instagram connections remain independent. See [Threads setup and publishing](docs/threads-publishing.md) for private configuration, limits and verification status. Live Threads grant/publication is not yet claimed.

## TikTok sandbox

TikTok supports explicitly connected sandbox accounts, one reviewed MP4 video with required privacy/interaction/disclosure/music choices, immediate posting and confirmed automatic schedules. Only private visibility is enabled. Separate encrypted credentials and safe refresh preserve other integrations; uncertain init requests are not resent. Private completion retains TikTok's publishing reference without inventing a public link. See [TikTok setup and publishing](docs/tiktok-publishing.md). Live OAuth/publication remains unverified until an owner-authorized real test.

## LinkedIn personal profiles

Personal LinkedIn connection, reviewed public text/JPEG/PNG/MP4 publication and automatic scheduling are implemented. Tokens stay encrypted server-side; uncertain writes are not resent. Company Pages require a separate Community Management app and approval and remain unavailable. See [LinkedIn setup and publishing](docs/linkedin-publishing.md). Live authorization and publication must be verified separately from local tests.

## Add channel

Social Accounts → Add channel opens a platform grid with actual server readiness, supported formats and a separate planning-reference link. Existing OAuth and explicit account selection continue in the same dialog. See [channel connection guide](docs/channel-connections.md).

## Content navigation

The sidebar groups Create Post, All Posts, Post templates, Content Calendar, Content Strategy, Content Pillars, Content Angles and Media Library under a collapsible Content section. Opening a content route expands its group; selecting a route closes the mobile drawer. Overview, Social Accounts, Analytics and Settings remain outside the group.

## Cross-platform composer

Select up to30 connected accounts from Facebook, Instagram, Threads, TikTok and LinkedIn within one brand. Compose shared content, optionally override captions by platform or account, inspect Channel checks, then review every destination before Publish now or Schedule. Shared media is the default; Media by platform can use different ordered images/video per platform, or an explicit empty selection for text-only channels. Checks and confirmation show each account's effective media. Draft/edit/duplicate and preview preserve platform media choices and the same caption precedence; details retain independent account results and cancellation. See [composer behavior and verification](docs/composer-preview.md). Verified locally with isolated tests and browser fixtures; no live cross-platform publication or deployment is claimed.

## Post templates

In Create Post choose Save as template to capture current unsaved content for the selected brand. Templates retain the title, main/platform/account captions, selected accounts, ordered shared/platform media (including text-only overrides) and content strategy. They never retain publishing schedules, account-specific times, TikTok choices or execution history. Saving a template leaves the current post unchanged.

Open Content → Post templates to search, rename, delete or use one. Every use creates an independent unscheduled draft in its original brand/demo workspace; review its accounts, media and new publishing time before publishing. Archived strategy is cleared with a warning; an archived brand cannot be used. Removing a template preserves existing drafts and media; referenced media remains protected while any template uses it. To revise content, create a draft from the template, edit it, save a new named template and remove the old one if no longer needed. See [composer behavior](docs/composer-preview.md). Verified locally; no deployment/live publication is claimed.

## Web AI writing assistant

Settings now supports your own OpenAI/Gemini model and encrypted API key. Create Post offers brief-to-caption, rewrite, shorten, ideas, tone, CTA and platform adaptation with review-before-apply and stale-edit protection. Adaptation updates only the selected platform caption. Applying does not save or publish. See [AI writing setup and verification](docs/ai-writing.md). Implemented locally; real provider use and online deployment remain unverified.
