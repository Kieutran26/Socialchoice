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

The actor alarm is shared by approved automatic schedules and active text/photo/video delivery. It advances one remote operation at a time and maintains a watchdog for a claimed operation. The earliest pending deadline is preserved; do not add an independent scheduler that overwrites this alarm. Old calendar plans do not set this alarm until confirmed. See [automatic scheduling](facebook-scheduling.md). Rollback code preserves storage, but older code cannot continue a photo workflow; verify no active photo attempt before rollback.

## Analytics rollout2026-10-13

Owner-authorized deployment of the independently reviewed multi-Page/Analytics build and one-Page compatibility/permission fixes completed. Worker version ff095650-8c66-4689-9489-26b88db766ec retains the same Worker name, SQLite namespace/class/object identity, migration tag, bindings and private secrets. Previous Worker version67515d3b-577f-449e-9a69-38e2d6604cac is the rollback reference; retain storage and check active jobs before rolling back.

Vercel production deployment dpl_8e8DM7nrvrnPC6rXFoyxte6GS39j serves socialchoice.vercel.app. This release used CLI prebuilt output staged under the ignored .test-tools/analytics-release directory, containing only dist UI files and Build Output API routes equivalent to vercel.json: API proxy first, filesystem then SPA fallback, API no-store headers. The linked existing project supplies CLI deployment identity; no workspace data, diagnostic files or server secrets were uploaded. Future source/Git builds still use the root vercel.json and package scripts.

Verified production UI200, exact SHA-256 match of deployed JavaScript to the tested dist artifact, API health200 and anonymous session401. No paid plan or secret/key change. Meta app enablement and owner OAuth/Deszy reimport are still pending; successful Analytics counters are not claimed. See [rollout record](../plans/reports/analytics-rollout-261013-socialchoice-report.md).

Instagram rollout2026-10-14: Worker version2f1fb2e5-a87f-4e8b-9526-686c5f4a5d5b and Vercel production dpl_Ez2cQWU1bCyvBgF1H7yRGpG2cHxZ deployed through the same CLI routes, with static-only prebuilt staging .test-tools/instagram-release. Existing data, keys, namespace, bindings and actor identity retained. UI artifact match/health200/anonymous401/invalid media capability403 verified. Previous Worker ff095650-8c66-4689-9489-26b88db766ec and Vercel dpl_8e8DM7nrvrnPC6rXFoyxte6GS39j are code rollback references; retain storage and check active jobs before rollback. Signed Instagram media reads use the configured backend HTTPS origin and the same existing private media storage. No live Instagram publication claimed. See [Instagram guide](instagram-publishing.md).


Threads rollout 2026-10-15: Worker c60c62c3-a5c7-477c-819e-db6fed68e418 and Vercel dpl_EP4GGVLGXS2qZNPC15WDzebwLgaC deployed using static-only staging .test-tools/threads-release. Public UI200, exact JavaScript artifact match, health200 and anonymous session/Threads status401 verified. Existing SQLite namespace, actor identity, bindings and stable keys retained. Distinct public Threads app ID/callback configured; THREADS_APP_SECRET has not been read or uploaded, so live connection remains pending. Previous Worker2f1fb2e5-a87f-4e8b-9526-686c5f4a5d5b and Vercel dpl_Ez2cQWU1bCyvBgF1H7yRGpG2cHxZ are rollback references; ensure no queued or processing Threads jobs before restoring older media runners. See [Threads guide](threads-publishing.md). No live Threads publication claimed.


Update 2026-10-15 08:24: owner explicitly approved product-secret read and storage. Meta reauthentication completed by owner. THREADS_APP_SECRET saved privately to the existing Worker through stdin; upload succeeded, other keys unchanged. No secret value logged or committed. Authenticated readiness/OAuth verification pending owner Socialchoice sign-in because session expired. No account import or publication claimed.


TikTok preparation2026-10-15: owner-reviewed public /privacy.html, /terms.html and /socialchoice-icon.png released in Vercel dpl_3ThJEfQcH678qhoQ7Qe3gcTcsNeo; all200 and exact source artifact matches. Worker/data/keys unchanged. TikTok sandbox portal configuration saved; URL verification pending owner download of the provider verification file. No TikTok runtime/OAuth/publishing success claimed.


URL verification2026-10-15 08:50: owner provided the actual downloaded TikTok verification file. Published its exact bytes under the root public/ path in Vercel dpl_M2HeUJz2nZgvpwabnULx35KMj9sE. TikTok sandbox confirmed "Your property has been verified", URL prefix https://socialchoice.vercel.app/, Verified. Keep the verification file on subsequent releases. Backend/keys unchanged. The backend media origin is not covered by this Vercel URL prefix; future TikTok media must use a verified delivery origin or separately verified backend prefix. No target user, private client-secret transfer, runtime connection or publishing claimed.


Private setup2026-10-15: owner explicitly authorized reading the Client key and Client secret of Socialchoice Test sandbox and storing them in existing Socialchoice Cloudflare backend. Captured only visible credential values into an ignored exclusive .env.tiktok, concealed them again, and uploaded only TIKTOK_CLIENT_KEY/TIKTOK_CLIENT_SECRET through Wrangler secret bulk stdin. Both uploads succeeded; other keys unchanged. Initial full credential-container HTML inspection was rejected by automatic review because it could expose keys in logs; completed through safer metadata-only inspection and variable-only credential capture. No secret value printed. TikTok redirect/mode still need runtime implementation/configuration; secret presence is not an OAuth connection or publishing proof.


TikTok runtime rollout2026-10-15: Worker d06089b4-963d-44c5-8474-6530711cc65b and Vercel dpl_FG2vctBTwBGXK5AatbpcTXV97WLD deployed via static-only .test-tools/tiktok-integration-release. UI200/exact tested JS match, health200, anonymous session/TikTok status401 and public policies/verificationfile200 verified. Existing namespace/class/object identity/migration/bindings/stable keys retained. Previous Vercel dpl_M2HeUJz2nZgvpwabnULx35KMj9sE and prior source Worker c60c62c3-a5c7-477c-819e-db6fed68e418 are code references only: retain current private settings and ensure no queued/processing TikTok jobs before restoring older source. Authenticated UI configuration ready and official TikTok login reached; actual user OAuth import/publication still pending. See [TikTok guide](tiktok-publishing.md).


LinkedIn personal rollout2026-10-15: reviewed Worker9e64bdd5-5eed-47d1-91f4-24eff5702b08 and Vercel dpl_9M5PGvY58V4tJXWDeeDS4D4F5qRC deployed via static-only .test-tools/linkedin-release. UI200/exact index-DCJDk-Dq.js match, health200, anonymous session/LinkedIn status401, policies and TikTok verificationfile200 verified. Existing namespace, actor, binding, migration, stable keys and other platform settings retained. Owner-approved callback saved; authenticated account screen shows LinkedIn ready and preserves Deszy+deszy_creative. Started real OAuth for active brand Test with only openid/profile/w_member_social and reached official LinkedIn sign-in; owner sign-in and grant/import pending. No real LinkedIn publication or schedule success claimed. Rollback references: previous Worker d06089b4-963d-44c5-8474-6530711cc65b and Vercel dpl_FG2vctBTwBGXK5AatbpcTXV97WLD. Retain private keys; do not restore a runner without LinkedIn support while LinkedIn jobs are queued/processing. See [LinkedIn guide](linkedin-publishing.md).
