# Inline LinkedIn @ mentions

Scope: composer UI only. No production deployment or live post.

Implemented a reusable textarea that opens ID-backed known-account suggestions when typing @. Applied to main Create Post caption, template captions, platform/account overrides and comment chains. Existing manual name/ID insertion remains available. No global styles or external search API added.

Checks: 14 focused tests pass; typecheck/lint/build pass before final UI verification. Browser fixture confirms Vietnamese search, Enter, pointer insertion in a sentence, React parent value/preview, Escape close and 390px layout without horizontal overflow. Review findings fixed: do not activate inside an existing token; match Đ/đ without accents. Browser exposed and verified fix for Escape reopening on selection events.

Publishing token format and parser unchanged. Suggestions use connected live LinkedIn accounts plus valid tokens in the same caption. The LinkedIn personal app has no general people-search API; the official People Typeahead API requires restricted organization follower permissions. No ID inference or fake search results.

Temporary browser fixture: ignored .test-tools/mention-input; local Vite on 127.0.0.1:5173, exec session 47093. Stop after verification; no database or provider writes.

Related prior investigation change: server/linkedin-graph.test.js adds coverage for the already-correct introspection endpoint. No provider endpoint was changed in this feature.

Online rollout remains pending because the session's production-change restriction has not been revoked. The user can review the local result before granting a frontend update.

## Authorized online rollout

2026-11-02: user explicitly approved production frontend release. Deployed static-only artifact to existing Vercel project Socialchoice; deployment `dpl_8tBiLYWKJEV5f1RH6XT2FmW3XC8S`, alias `https://socialchoice.vercel.app`, READY. Preserved API routes and policies; no backend deployment or configuration changes. Existing CLI authentication completed automatically; no user credential was printed or requested.

Final typecheck, lint and build pass. Live acceptance script confirms exact artifact hashes and all API/auth boundary checks. Authenticated browser verifies @kieu suggestion and Enter insertion for the existing connected LinkedIn account. Caption and destination selection were restored; no post was saved, scheduled or published. Temporary local Vite PID45244 stopped after fixture verification.

Previous production frontend URL for rollback: https://socialchoice-5hll1j2zo-nguyenngockieutran-3710s-projects.vercel.app. No outstanding release blocker. Broad LinkedIn member search remains outside the granted API capability.
