# Socialchoice

Standalone local content planning workspace. React/Vite frontend plus an owned Node/SQLite backend. The existing page layout, neutral palette, Mona Sans/Space Grotesk typography, Phosphor icons and skewed green buttons are retained. The supplied source had missing components and a broken entry file; Phase A restores them without replacing the existing page designs.

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

Meta OAuth, API Page discovery, selected Page import, encrypted server-only tokens, reconnect, access check and local disconnect are implemented. Run `npm run setup:meta` to configure your Meta App locally (hidden App Secret prompt), restart the app, then connect under Social Accounts. This requires an admin session and authorized Page access. Local configuration does not imply Meta approval or a verified live connection. See [Facebook connection setup](docs/facebook-connection-setup.md). Publish Now supports text, up to ten stored images, or one stored MP4/H.264 video to exactly one connected Facebook Page with pages_manage_posts and a content-creation task. It shows the exact Page/caption for confirmation, preserves one durable attempt and only records Published after a valid Page post ID, or a ready, published video with matching Page identity. Automatic scheduling is available after exact Page/content/time confirmation; see [scheduling](docs/facebook-scheduling.md).

## Online deployment preparation

The Vercel UI domain is `https://socialchoice.vercel.app`. Its free Cloudflare backend is deployed at `https://socialchoice-api.nguyenngockieutran.workers.dev`; health and anonymous access rejection are verified. `wrangler.jsonc` owns configuration; shared logic preserves local Node operation. `pnpm run setup:cloudflare` provisions private values after authorized Wrangler login. See [online deployment](docs/online-deployment.md) for persistence, cutover and rollback. Real Meta OAuth, Page discovery and owner-approved text publication have been verified. The owner reports successful photo publication. An owner-approved video publication was independently verified on Facebook on 2026-10-13.

## Not implemented yet

Multi-Page publishing, platform metrics and automatic resend of uncertain delivery are unavailable. Old calendar plans stay planning-only until explicitly confirmed for automatic delivery. Sample published records are simulation only.

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
