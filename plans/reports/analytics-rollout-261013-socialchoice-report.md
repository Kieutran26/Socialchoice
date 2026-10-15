# Analytics online rollout

Date:2026-10-13 Asia/Saigon. Owner approved deployment, Meta permission setup and Deszy reconnect after the one-Page test. Reviewed source had80/80 tests, lint/typecheck/build and independent review passing. No application source changes after that review.

Deployed existing Cloudflare Worker socialchoice-api: version ff095650-8c66-4689-9489-26b88db766ec. Same SQLite binding, class, migration and object identity; no secret updates, namespace deletion or external data import. Wrangler dry-run and real deployment succeeded. Previous version67515d3b-577f-449e-9a69-38e2d6604cac retained as rollback reference.

Deployed existing Vercel socialchoice project: dpl_8e8DM7nrvrnPC6rXFoyxte6GS39j, alias https://socialchoice.vercel.app. Only the reviewed dist static files and API/SPA routing were included through CLI prebuilt output in ignored .test-tools/analytics-release. Source, diagnostics, local databases and secrets were excluded. No Git commit/push or paid upgrade was performed.

Verification: production UI200, deployed /assets/index-1XhmIB7a.js SHA-256 equals local dist asset; public /api/health200 configured/admin-session; anonymous /api/session with required client header401. Backend health200 and anonymous401 also verified. Initial verification command had a local Node eval syntax error; corrected module-mode verification passed and changed no online state.

Blocked owner interaction: browser automation initialization failed with kernel-assets path error through both supported controllers. Meta App dashboard and Socialchoice browser panels were requested (app returned queued). No Meta permission enablement, OAuth consent, token replacement, Deszy reimport or successful counter refresh was performed or claimed. Existing valid token lacks pages_read_user_content; grant cannot be inferred from deployment.

Next: owner enables pages_read_user_content for the existing Meta App's Pages use case and completes Meta-required access/testing steps; reconnect Facebook in Social Accounts, select/import Deszy, then rerun Analytics real reads. No new Facebook post was published or edited by this release.
