# Autopilot follow-up: public-image recovery and safe diagnostics

Date: 2026-11-01 (Asia/Ho_Chi_Minh)

## Outcome

Reproduced and fixed a public Drive image failure when `files.get` omits `parents`. This is a reproducible failure mode, **not a confirmed diagnosis of the earlier live staging failure**. The previous live job retained only `REVIEW_REQUIRED`, which cannot establish the underlying cause retrospectively.

The repair is deployed to **socialchoice-autopilot-staging only**. Production/main have not been modified, merged or deployed. No authentication bypass, new public RPC, secret extraction, real AI retry or social publication was used in this follow-up.

**Real provider acceptance remains open.** The current execution environment has a new cloud browser with no old signed-in tabs. Opening staging `/media` displayed admin sign-in. The secure authentication request returned `declined`; no credential was entered, no sign-in retry was attempted and no private application data was accessed. The earlier successful OpenRouter connection test is historical evidence, not a new successful image request.

## Changes

- Public image reads still require exact folder membership and unchanged version. When `parents` is absent, verify the public folder, search only its direct children through the fixed Drive API and compare exact file ID/version. Do not download if membership cannot be established. Check again after download when listing was needed or no checksum is present. At most 100 listing pages and one 45-second total source-image deadline; reject repeated cursors, incomplete results, revoked access, moved files and changed versions. No fallback to arbitrary public download URLs or OAuth.
- Persist only allowlisted failure codes, a fixed processing step and numeric HTTP status. Raw provider bodies, URLs, headers, keys, images and prompts are not stored in diagnostics. Keep Worker logs disabled.
- Asset Intelligence now shares bounded, safe AI response classification with writing. Distinguish access, billing, quota, model, redirect, unavailable, incomplete and invalid-schema results. No automatic AI retry was added.
- Reconfirming Analyze on an already failed job now explains that explicit Retry is required, instead of silently returning the old failed job. Confirmed Retry clears old diagnostics and changes the current asset status to queued. Cache and human review remain in place.
- Show translated, actionable failure messages and the failed step. Legacy failed jobs retain their old generic error until an explicitly confirmed retry creates fresh evidence.
- Rebuilding the staging artifact preserves an existing staging configuration and refuses a non-staging Worker name. Fresh staging defaults include R2, Queue/DLQ, disabled version previews and disabled observability. Verified that a repeated build preserves the config checksum.

## Verification

| Check | Result / scope |
|---|---|
| Full server suite | PASS, **241/241**, Node 24.22.1 on Linux |
| Lint / typecheck / Vite build | PASS; existing large bundle warning |
| Auth broker / license tests | PASS, 19/19 broker; 3 license passed, 1 Windows-only skipped |
| Actual workerd + SQLite + R2 + Queue + private RPC | PASS with isolated outbound Drive/OpenRouter fixtures |
| Omitted parents | Reproduced old rejection; repaired path completes image analysis with fixture responses |
| Folder pagination, missing/moved file, version changes, revoked access, repeated cursor | PASS with fixtures; no image reaches AI after source rejection |
| AI 401/402/403/404/429/503/400/302, malformed and extra-schema output | PASS, safe classification and no automatic retry |
| Failed source read, explicit retry consent, successful recovery, cache, approval | PASS; raw error text excluded from persisted/public data |
| File version invalidates analysis/review | PASS in actual workerd test with fixtures |
| Brand filtering and no post creation | PASS in actual workerd test; existing customer isolation suite passes |
| Staging upload | PASS, artifact checksum verified before upload; settings read back |
| Anonymous staging catalog | 401, Sign in required |
| Staging HTML | Matches local built index |
| UI fixture desktop / 390px frame | Safe Vietnamese error and step rendered; Retry opens consent dialog; Escape cancels; mobile content width = scroll width = 373px |
| Real public-image download and OpenRouter vision after repair | **BLOCKED by missing authenticated staging session** |
| Real OCR accuracy, cache-hit billing behavior and review | **Not accepted** |

Runtime tests use actual Cloudflare runtime components but **mock external provider responses**. The public UI fixture is visibly labeled simulation and never calls Drive, AI or publishing. Its simulated billing error is not evidence of the user's account balance.

Screenshots: [desktop fixture](evidence-20261101/desktop.jpg), [mobile frame](evidence-20261101/mobile.jpg). Full-page capture timed out; viewport captures succeeded.

## Deployment evidence

- Worker: `socialchoice-autopilot-staging`
- Version: `73490a83-f44d-471e-bc18-b0b6d9648209` at 100%
- Deployment ID: `3f92f261-d0b1-4e5b-bf5b-b9f9821b86aa`
- Created: `2026-11-01T00:39:44.007656Z`
- Bundled script SHA-256: `426b120ddf3d671a9c90fdb259295a92516128e1f9804cd65036ae95af4c55dd`
- Remote readback confirms existing Secret names, `WORKSPACE`, `AI_EGRESS`, staging R2 bucket and Queue producer retained. Secret values were not read or printed. Version previews remain disabled.
- The existing labeled UI fixture is included in the final artifact. The intermediate backend deployment was superseded by this version.

## Next real acceptance

1. Obtain an authenticated staging session through the secure browser sign-in form. Do not paste credentials or API keys into chat.
2. Select Autopilot Drive Acceptance and sync its synthetic public folder; verify two assets and repeat-sync deduplication.
3. Explicitly retry the failed synthetic `gemini-acceptance-test.png` analysis once. Observe its new safe diagnostic or completion; do not automatically repeat a paid or uncertain call.
4. On success, compare OCR against `TEST SALE 20%`, inspect visible facts/warnings, confirm pending review, request cached analysis and verify no extra job/provider request, then approve/reject and verify persistence.
5. Recheck another brand and workspace boundary. Record live evidence separately from fixture coverage.

Production release, OAuth refresh, real resource-key folder pagination, live cross-customer isolation and operator dead-letter recovery remain separate open gates. Phase 1 is not accepted for production.
