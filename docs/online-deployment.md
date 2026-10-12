# Online deployment

Accepted route: Vercel keeps the existing UI at https://socialchoice.vercel.app. Cloudflare Worker `socialchoice-api` forwards API requests to a SQLite-backed Durable Object for this single-admin workspace. Node/SQLite local mode and the cloud adapter share validation, authentication and planning logic. No paid service is required or provisioned.

## Free plan

Account Workers plan verified in the dashboard on 2026-10-12: Free, $0, Current plan. SQLite Durable Objects are supported on Free. Quotas are shared with other account applications: 100,000 Worker requests/day, 100,000 Durable Object requests/day, 13,000 GB-s duration/day, 5 GB SQL storage, 5 million SQL rows read/day and 100,000 rows written/day. Exceeding Free limits can interrupt service; this is not unlimited hosting. Never enable Paid without owner approval. See [official pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/).

## Configuration and release

`wrangler.jsonc` owns the nonsecret account, Worker name, SQLite migration, app origin and HTTPS Meta callback. The Worker uses one object for one admin; it is not a multi-tenant service. Frontend remains unchanged.

Required private Worker secrets: `SOCIALCHOICE_ADMIN_PASSWORD_HASH` and a stable, random 32-byte hex `SOCIALCHOICE_STORAGE_KEY`. The latter encrypts persistent sessions, login throttle and pending OAuth state. Keep it in a private backup; changing it invalidates access to that state. Meta additionally needs `META_APP_SECRET`, `META_TOKEN_ENCRYPTION_KEY`, `META_GRAPH_VERSION` and optional `META_LOGIN_CONFIG_ID`. Never put secrets into VITE variables, Git, logs or chat. An unconfigured Worker returns 503 and refuses workspace access.

1. Run `pnpm test`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run build`. The Worker test builds the actual cloud bundle and verifies authentication, Vietnamese content, sessions and login throttling across runtime restarts in an isolated database.
2. Deploy only the named Worker, preserving the SQLite namespace and migration tag on subsequent deployments. Privately set secrets. Verify its actual `/api/health` JSON and anonymous access rejection before connecting the UI.
3. Run `node server/configure-api-proxy.js https://ACTUAL-BACKEND-ORIGIN` after verification. It places the API rewrite before the SPA fallback and creates an exclusive rollback backup. Deploy Vercel and verify health and login through the public app domain.
4. Register `https://socialchoice.vercel.app/api/meta/callback` in Meta only after routing is working. Complete real OAuth and Page import before reporting a connected account. Text Publish Now requires the separately granted publishing scope and reviewed confirmation; calendar delivery remains unavailable.

## Persistence and rollback

Cloud starts empty. Local `data/socialchoice.sqlite` is untouched; no content or existing platform credentials are automatically transferred. Persistent cloud content and encrypted state survive actor eviction/redeploy. Local Node sessions continue to expire on Node restart; cloud sessions retain their eight-hour absolute expiry.

Do not delete a Durable Object namespace, rename its identity or change its encryption keys to fix code. Roll back Worker source while retaining storage; restore the previous Vercel deployment/config independently. A code rollback does not roll back data. Durable Object SQLite supports provider point-in-time recovery; retain independent private backups before any requested data migration. No cloud export/import feature is claimed here.

Status: Cloudflare Free backend and Vercel API cutover verified online. Public Meta callback saved and validated. Owner sign-in and real Meta OAuth/Page discovery were verified. A real publication is still pending permission and an approved text post.

Private CLI route after explicit scope approval: set `XDG_CONFIG_HOME=D:/Socialchoice/.wrangler/config` for Wrangler commands, authenticate with approved scopes, deploy `wrangler.jsonc`, then run `pnpm run setup:cloudflare`. That helper sends local admin hash and stable storage key through stdin, prints no values, optionally supplies existing private Meta settings, and never overwrites the saved key. Its `.env.cloudflare` and OAuth configuration directory are ignored by Git. Protect local backups and revoke Wrangler access when no longer needed. No CLI authentication or secret upload is claimed until verified.

Live status 2026-10-12: Socialchoice Worker deployed at https://socialchoice-api.nguyenngockieutran.workers.dev on the verified Free plan. Private admin/storage secrets provisioned; health200 and anonymous session401 verified. Owner scoped Wrangler authorization completed via device flow. Vercel cutover is prepared locally and still requires deployment verification. Meta remains configuration_required.

Cutover verified: Vercel deployment 9edRC65B3Z64nvF2iYgRsyPE39oU from commit adaf9aa serves API JSON through https://socialchoice.vercel.app. Health200, anonymous session401, Vietnamese sign-in screen verified. Owner password login and Meta OAuth require owner interaction; neither is claimed as successful.


## Private photo delivery

Photo bytes are stored in image_chunks in the same SQLite actor; each chunk stays below the SQL 2 MB row limit. No namespace, binding or encryption-key changes and no paid bucket are required. The 200 MiB cap applies to encoded chunk bytes. Full workspace backups must include those rows as well as records/attempts.

The actor alarm is now owned by confirmed photo Publish Now attempts. It advances one remote operation at a time and maintains a watchdog for a claimed operation. Do not add an independent scheduler that overwrites this alarm; coordinate any future work through the same persisted queue. Calendar plans do not set this alarm. Rollback code preserves storage, but older code cannot continue a photo workflow; verify no active photo attempt before rollback.
