# Gemini AI_EGRESS diagnostic repair

Status: implemented and independently reviewed; [draft PR #1](https://github.com/Kieutran26/Socialchoice/pull/1) created. Original authenticated timeout unresolved.

## Evidence

- Repository origin and fetched main match Kieutran26/Socialchoice; starting tree clean at 2cffeb9.
- Frontend src/api/ai.js sends same-origin POST /api/ai/{operation}. Vercel forwards /api to the existing Cloudflare Worker. Customer/owner gateway routes into isolated workspace runtimes. HTTP handler invokes createAiWriting using createRegionalAiFetch(env.AI_EGRESS). Gemini alone traverses SocialchoiceAiEgress; its fixed Google endpoint uses header credentials and no stored content.
- Production version 0c67d46f-1a45-45a6-905c-57cbae72ab58 includes AI_EGRESS. Temporary remote preview called the existing gemini-us-v1 actor in US jurisdiction with an intentionally invalid diagnostic key. Google returned HTTP400 JSON in approximately458ms. Binding lookup, actor invocation and provider connectivity work for that request. This does not establish real-key permissions, geography acceptance, model latency or generation success.
- Frontend and backend health200, anonymous AI status401, JSON and no-store verified. Probe stopped; port8791 released. No customer data, settings, credentials or deployment modified.
- User supplied localized message matching AI provider timeout. Existing implementation maps any outer timeout, including actor invocation, to provider timeout504. Original502 report and this504 must not be conflated. No authenticated request/cookie available; browser automation failed sandbox initialization.

## Proven defects and repair

- Missing binding and private actor exceptions previously collapsed into generic provider connection502. Safe typed errors now preserve binding503, relay502/504 and provider diagnostics across actor and HTTP boundaries.
- Provider rejections intentionally still return application502, now with providerStatus and stage/code so Google400/403/429 is distinguishable. Provider redirect, invalid/incomplete output, transport and timeout have distinct codes. No raw upstream body, key or prompt is returned.
- Previously any thrown error carrying status bypassed sanitization. Only application-owned AiError now bypasses the safe fallback.
- Frontend unconditionally parsed JSON, masking HTML/empty proxy failures with a syntax exception. Decoder now returns fixed proxy errors and preserves HTTP status. Vietnamese messages added; no layout/styles changed.
- No provider/model/key change, retry, storage migration or public relay added. Existing deadlines remain45seconds.

## Validation

- New failure-path tests first failed against old implementation, then passed.
- Full backend suite201/201 including bundled Cloudflare runtime. AI-focused suite22 tests included in full suite.
- Lint, web typecheck, desktop typecheck and production build passed. Existing bundle-size warning remains.
- Independent review found two boundary issues; fixed JSON proxy-message leakage with an allowlist and actor/platform misclassification with an explicit provider marker. Re-review reports no remaining code correctness/security findings. Source-only API/locale changes; browser visual verification unavailable due sandbox setup failure.

## Deployment and rollback

Repair is not deployed. Existing deployment only was verified. Merge/release through existing workflow while preserving WORKSPACE/CUSTOMER_DIRECTORY/CUSTOMER_WORKSPACES/AI_EGRESS bindings and all existing migrations and secrets. No migration needed. Roll back source/frontend independently while retaining those bindings; diagnostics disappear with rollback.

## Unresolved questions

- Which Model ID is configured, and does authenticated failure originate in actor transport or provider inference? Need the real-key test's sanitized stage/code after release or authenticated timing evidence; never ask for keys/cookies.
- Successful Gemini generation with the owner's API account remains unverified. Do not represent diagnostic repair as proof the original timeout is resolved.
