# Socialchoice audit and migration

Audit started 2026-10-12, D:\Socialchoice. Product authority: SOCIALCHOICE_PROJECT_GUIDE.md. This report distinguishes supplied source from verified implementation. No secrets were read or printed. No deployment or external publishing performed.

## Supplied stack and run path

- React 18, React Router 6, JavaScript JSX, Vite 8, React Vite plugin 6. No Next.js app.
- Tailwind 3/PostCSS/Autoprefixer, Radix/shadcn-style imports, Phosphor app icons, Recharts 2, TanStack Query 5. Legacy auth pages used Lucide. Mona Sans headings/Space Grotesk body, neutral OKLCH tokens, green #79D94B, skewed hard-shadow CTA already present.
- Other declared libraries: React Hook Form/Zod, DnD, Framer Motion, Stripe, PDF/canvas, editor, maps, Three.js, date-fns/moment, toast libraries. Several are unused starter dependencies; removing them is lower priority than data correctness.
- Original backend: Base44 SDK ^0.8.53 and Vite plugin ^1.0.44; entity schema declarations, no custom backend functions or server worker found.
- Original README prescribed npm install, Base44 CLI/Deno, base44 login/link/dev; base44 dev --remote writes hosted data; publication through Base44 dashboard/Git sync. These original run instructions were not a verified working environment.

## Original blockers found before edits

1. src/components absent: every page imported unavailable UI, layout, forms and data-display components.
2. src/main.jsx was shadcn config JSON, not a React entry; .gitignore also contained that JSON.
3. No Git repository/history, package lock, installed packages or .env.example. No environment secret values inspected.
4. Tailwind mapped raw OKLCH channels as CSS colors, producing invalid style values; status/surface color names used by screens were undefined.
5. Auth boot fetched hosted public app settings; protected routes required hosted auth.
6. Entity consumers expected a custom paginated shape {items, rows, count, next_cursor}, not consistently the documented stock SDK entity shape. SDK coupling needed replacement, not blind method substitution.
7. Demo workspace automatically seeded at boot. Sample data included simulated published posts/jobs; actual Meta integration absent.
8. Publishing engine ran in frontend, delivered no API calls, used non-atomic claims and mutable Post content. Source comments/UI overstated duplicate prevention and Builder+ requirements. No server worker existed.
9. Missing server enforcement of brand/pillar/angle relationships, archive/delete safety, authenticated owner access and protected credential storage.

## Base44 dependency inventory

| Surface | Original dependency | Phase A treatment |
|---|---|---|
| package.json | @base44/sdk, @base44/vite-plugin | Removed; lockfile records standalone install |
| vite.config.js | SDK aliases, hosted proxy, HMR/navigation/analytics/visual edit hooks | Native React Vite plugin, explicit alias and local API proxy |
| src/api/base44Client.js | SDK createClient(appId/token/functionsVersion/appBaseUrl) | Legacy compatibility export only; actual appClient in src/api/app-client.js |
| src/lib/app-params.js | getAccessToken, Base44 env variables, browser token storage | Inert compatibility metadata, no SDK/token lookup |
| src/lib/AuthContext.jsx | app.getPublicSettings, auth.me/logout/redirect | Explicit loopback-only owner context; hosted auth not claimed |
| Login/Register/ForgotPassword/ResetPassword | Email login/register/OTP/Google/password reset | Source retained, routes inactive; unavailable methods fail explicitly |
| OAuthConsent.jsx | Base44 MCP OAuth consent endpoints/comments | Retained inactive source; no MCP grant/OAuth implementation claimed |
| All 11 application pages | Entity CRUD/filter/count/aggregate/bulk/updateMany | Standalone HTTP entity adapter, transactional SQLite operations |
| workspace-context/demo-seed | Hosted Brand data and automatic sample seeding | Persistent local workspace, real data by default, explicitly selected demo only |
| src/lib/jobs.js | PublishJob/PostVariant lifecycle | Planning compatibility only; not a reliable publishing worker |
| src/lib/engine.js | Browser-side job runner and logs | Honest unavailable publishing health response; no fake success |
| MediaLibrary/composer | Core.UploadPublicFile | Storage unavailable, explicit errors/notice |
| base44/entities | Brand, ContentPillar, ContentAngle, Post, PostVariant, SocialAccount, MediaAsset, PublishJob, PublishingLog, OAuthCredential, User | Originals retained; nonsecret schemas adapted into owned server schema file; credential/User API inaccessible |
| base44/config.jsonc | Base44 install/build/serve/publish config | Retained reference, not used by standalone runtime |
| index.html | Remote Base44 favicon | Removed |
| src/index.css | Base44-hosted Neue Haas fallback fonts | Removed hosted font requests; primary Mona Sans/Space Grotesk retained |
| README.md | Base44 login/link/dev/publish workflow and production-write assumptions | Updated for standalone run/backup/boundary |

All active app data requests now go to the local backend. Retained Base44 references are compatibility names, archived configuration/comments, and original backup source; no active SDK or paid connector is needed.

## Prioritized migration

1. **Phase A:** keep React/Vite and existing page markup/tokens; restore missing components; owned persistent local API; Brands/Pillars/Angles/Post CRUD, drafts/edit/duplicate, calendar month/week/list, UTC planning, unique content mix; prove restart persistence, scope integrity, safe history and truthful statuses.
2. **Production foundation before public exposure:** choose deployment and durable PostgreSQL/Supabase database, real admin session authentication/owner authorization, HTTPS, backup/restore, secret management. Current Phase A API binds to 127.0.0.1 only and is not a publicly deployed authenticated service.
3. **Phase B OAuth:** configured Meta App and callback, server state/CSRF, official Page discovery, actual scopes, encrypted server tokens, disconnect/reconnect/revoke. Owner enters App ID/Secret into server environment, not chat. API approval/Business Verification may block non-test users; verify current Meta docs at implementation time.
4. **Phase B publishing:** authorized Page text test, locked revisions, per-Page jobs, server worker/atomic claims, bounded retries/rate limits, ambiguous-result reconciliation and confirmed external IDs. Test scheduler with browser closed; no current claim of delivery.
5. **Phase C:** storage/media validation, async photo/video, batches, platform caption snapshots, real platform metrics and other API adapters. Defer starter dependency cleanup/code splitting until core workflows are stable.

## Current implementation classification

- Implemented: owned SQLite persistence/API, local UI restoration, validation and protected entity/state boundaries; checks/evidence detailed in Phase A validation report.
- Demo: explicitly selected sample workspace only; separate is_demo records and visible simulation banner; sample history is never live platform evidence.
- Not started: hosted auth/deployment, media upload storage, Meta OAuth/Page discovery/publishing, reliable server scheduler/retries and real engagement analytics.
- Potential external approval blocker for Phase B: Meta App permissions/review and owner-provided environment configuration. No credentials or approvals required to finish local Phase A.

Unresolved: hosting/database provider for public deployment; Meta App/domain and authorized test Page when Phase B begins. Neither blocks local Phase A.
