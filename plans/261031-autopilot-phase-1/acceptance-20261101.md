# Autopilot follow-up: public-image recovery and safe diagnostics

Latest result: user accepted Phase 1 on staging for ordinary public Drive folders on 2026-11-01. Real resource-key-required folders are explicitly deferred and unverified; production release is not authorized. Earlier results below are historical.

Date: 2026-11-01 (Asia/Ho_Chi_Minh)

## User acceptance — 2026-11-01 (Asia/Ho_Chi_Minh)

**Status: Phase 1 CLOSED for the agreed ordinary public-Drive-folder workflow on staging.**

After the scope and remaining limitation were explained, the user reported: “tôi thấy oke rồi”. This records user acceptance of the staging workflow, together with the technical evidence below; it does not invent additional user test steps.

Accepted scope: ordinary public folder link ingestion, private workspace Asset Library/R2 metadata, Queue processing and sync recovery/deduplication, confirmed OpenRouter/Gemini image analysis, cache/version handling and human review. Refer to the closing-gate follow-up for the 242/242 server checks, 23/23 separate-cloud customer-isolation checks, real version restoration and 101-file pagination evidence.

Explicit scope exception: real resource-key-required folders remain **UNVERIFIED**. This case is deferred from the accepted Phase 1 scope, not marked passed. Existing synthetic coverage is retained. OAuth is outside the selected public-link workflow.

This scoped acceptance supersedes earlier statements that Phase 1 cannot close solely because the resource-key fixture is unavailable. Historical failed runs and limitations below remain evidence and are not erased.

No production release, main change or merge is authorized. Current accepted staging version: `4bffc1a5-3daf-4cd6-971d-bbf336be407d`. This acceptance update changes documentation only; no new tests or deployment were performed.

## Outcome of first run (before authenticated follow-up)

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

## Authenticated real AI follow-up — 2026-11-01

**Outcome: the single synthetic public-Drive image / OpenRouter vision flow passes staging acceptance.** This section supersedes the authentication blocker from the first run above. The existing in-app browser became available again and showed the signed-in workspace owner; no password or provider key was read or entered.

On the deployed version `73490a83-f44d-471e-bc18-b0b6d9648209`, the agent explicitly retried the earlier failed analysis of `gemini-acceptance-test.png` in brand Autopilot Drive Acceptance. Queue progressed queued → running → done without manual job processing.

Observed real output:
- Provider/model: `openrouter / google/gemini-3.8-flash`.
- OCR: **TEST SALE 20%**, matching the synthetic source image.
- Vietnamese summary correctly describes the white background, black pixel text, green rectangle and black horizontal line.
- Tags and suggested uses were returned, with warnings that this is test/unfinished content and suggestions need human review.
- Result initially remained pending human review. The agent reviewed this synthetic result and selected Approve; UI changed to Analyzed / Approved.

| Live check | Evidence |
|---|---|
| Public image download + real AI analysis | Queue completed and returned image-specific facts and exact OCR |
| Cache behavior | Confirmed Analyze again for the same image/model; existing result remained, with still exactly one completed AI job and no new queued/running AI job |
| Approval persistence | Reloaded page, reselected brand; approved analysis and OCR still present |
| Repeat sync / deduplication | New Queue sync completed automatically; exactly 2 imported assets remain, analysis/approval retained |
| Brand filtering | Autopilot Acceptance shows only its existing R2 fixture and source/jobs; public Drive image and its analysis absent |
| Credentials / production | No credentials inspected; no main edit, production deployment or social posting |

Cache evidence is application/UI behavior combined with existing automated cache tests. OpenRouter usage counters and billing records were not independently inspected; no exact charge or provider-side request-count claim is made. The earlier generic failure's precise cause remains unproven retrospectively, although the repaired flow now succeeds.

A screenshot of the actual approved result and exact OCR was saved locally. Automatic approval review rejected publishing that screenshot to GitHub because of possible workspace metadata disclosure without separate publication authorization; it was not uploaded. This text records only the synthetic fixture details already documented in the repository.

This accepts **one real synthetic-image path with the configured model**, not every model/file format or a production release. Live cross-customer isolation, access-revocation acceptance, resource-key folder/pagination cases and dead-letter operations remain separate gates.

## Operational failure gates — 2026-11-01

### Real staging: public-access revocation and recovery — PASS

Used only the existing synthetic folder Socialchoice Autopilot Staging Test. The owner browser showed the folder's initial Anyone with the link / Viewer sharing state.

1. Changed general access to Restricted and observed Google's access-updated confirmation.
2. Queued a real staging sync. The job failed with the safe SOURCE_ACCESS_DENIED message at Reading source metadata. The two catalog records and the approved AI result were preserved.
3. Restored the same original Anyone with the link / Viewer state and verified Google's access-updated confirmation.
4. Selected Retry for the failed sync. The existing job completed successfully; the catalog was not duplicated.

This verifies failed sync preservation and manual recovery, not a separate revoked-access AI-byte request. No AI call was made in this gate run.

### Real staging: removed file and restoration — PASS

Moved only the synthetic 68-byte drive-public-test.png into Google Drive Trash (recoverable, not permanently deleted). After a complete queued sync, the catalog retained its record as Missing and disabled Analyze image. The independently approved gemini-acceptance-test.png remained available and approved.

Restored exactly drive-public-test.png from Trash. Drive folder listing again contains both known synthetic files. A further Queue sync completed, returned the same catalog record to Available and left exactly two assets, with the other image's approved analysis retained. No unrelated Trash item was modified.

This verifies deletion/restoration availability. A real byte-replacement/version-change invalidation test was not performed; automated version/cache invalidation coverage passes.

### Real Cloudflare Queue → DLQ → operator recovery — PASS for synthetic routing failure

- Verified staging consumer: batch 1, max concurrency 1, eight retries, staging dead-letter Queue; DLQ initially empty with no consumers.
- Sent one routing-only synthetic message targeting a deliberately nonexistent fixture workspace. It contained no credentials, filenames, image bytes or prompts.
- Observed the message in the staging DLQ after about 251 seconds. DLQ metadata identified the staging source Queue and the synthetic payload.
- The first pull returned HTTP 405 because DLQ http_pull mode was not enabled. Created a temporary HTTP pull consumer after verifying there were no existing consumers.
- Pulled and matched only the synthetic message. Dispatched its deliberately corrected owner fixture routing to the main staging Queue, then acknowledged only the original test lease after dispatch succeeded. API returned ackCount 1 / retryCount 0. No unrelated message was acknowledged.
- Removed the temporary pull consumer and read back an empty consumer list.
- Final readback: main backlog_count 0, DLQ backlog_count 0; final UI sync completed.

This is a controlled operator recovery test for a known synthetic routing defect. It does **not** authorize mapping unknown customer messages to owner, replaying uncertain paid AI calls, or purging a Queue. For a real dead letter, establish its correct workspace before redelivery; retain the original when dispatch fails.

### Workspace isolation — runtime PASS; live customer-cloud gate still BLOCKED

Recreated an isolated source-only test directory, synchronized the current feature's modified server/tests, and ran:

node --test server/customer-runtime.test.js server/autopilot-runtime.test.js server/autopilot.test.js server/openrouter.test.js

Result: **27/27 PASS**, Windows / Node 24.17.0. Tests include actual workerd, SQLite and Queue, two independently authenticated customer workspaces, cross-customer brand/source/OAuth/media/session rejection, owner isolation, provider fixtures, source membership/version checks and consented retry/cache/review. These are real local runtime components with synthetic external responses, not new cloud customer accounts.

The live staging /api/customer/config endpoint returned ready:false. Its currently configured single-owner mode cannot register two licensed customer accounts, so local two-customer tests and live brand filtering are not claimed as a completed cloud cross-customer gate. No customer licensing keys, bindings or production data were copied or provisioned to force this test.

### Final state and remaining release gates

- Existing public folder sharing and both synthetic files restored.
- Exactly two imported public assets; meaningful image analysis remains approved.
- No pending staging Queue/DLQ messages from these tests; temporary DLQ consumer removed.
- No application code change or new deployment in this gate run. Worker remains 73490a83-f44d-471e-bc18-b0b6d9648209.
- No main change, merge, production deployment, secret inspection or social publication.
- Actual-state screenshot saved locally; no screenshot upload to GitHub was attempted in this run.

Phase 1 remains **not accepted for production**. Outstanding real cases include cloud customer-to-customer isolation (requires an isolated customer-enabled staging configuration), binary-version invalidation, resource-key protected folders and large-folder pagination. Public-folder ingestion, one real AI image path, access-revocation sync recovery, removed-file restoration and synthetic DLQ operations now have real staging evidence.

## Closing-gate follow-up — 2026-11-01

This section supersedes the remaining-gate list above where explicitly marked PASS. Phase 1 is still **not fully closed**: a real resource-key-required folder fixture is unavailable.

### Live cloud customer isolation — PASS, 23/23 checks

Deployed the feature backend to a separate disposable staging configuration, `socialchoice-autopilot-isolation-staging`, with its own R2 bucket, workspace/customer-directory/customer-workspace Durable Objects, freshly generated test-only licensing issuer and encryption key. No production or main-staging credentials or data were copied.

Version: `975d4b5a-5c7e-4d60-be41-61b203fd83f3`; backend artifact SHA-256 `408ab3bf2486220ba6836a0fdc72f104097460a416de5743071e609141d3c595`.

Two independently licensed synthetic customer accounts registered successfully. Actual API checks verified distinct actors and storage prefixes; customer B cannot list/update A's brand, connect A's source, forge a source under A's brand, retry A's job or read A's image. Anonymous catalog/image requests return 401; cross-customer writes/image access return 404. A can sync through the real private R2 binding and read identical uploaded bytes. B cannot see A's sources, jobs, assets or encrypted dummy AI configuration. Logging out B does not revoke A.

These 23 checks use real Cloudflare customer sessions, Durable Objects and private storage, with synthetic data. The dummy AI credential was never sent to a provider. They do not claim a new paid AI request in customer mode.

After testing, disabled the isolation Worker's workers.dev endpoint and preview URLs; readback confirms both false. Temporary build-upload R2 objects were removed. The isolated fixture resources remain for review. Main staging stays in its existing owner mode.

### Real binary-version invalidation and restoration — PASS after repair

Uploaded a valid PNG variant of only the existing synthetic gemini-acceptance-test.png through Drive Manage versions: 3837 to 3877 bytes. Pixels were unchanged; a valid metadata chunk changed the binary checksum. A real queued sync cleared the existing AI analysis and approval, while retaining the asset identity and exactly two original-folder assets.

Restoring the original 3837 bytes and syncing exposed a real defect: Analyze returned the historical completed job while the asset remained Not analyzed. Reproduced before repair; no new AI job appeared.

Fixed in feature commit `7204ddc3912047c90a34b92834d758b35d156f99`:
- Increment an asset analysis revision on each observed binary-version change, including a return to previous bytes.
- Include that revision in analysis cache/job deduplication, preserving legacy keys for unchanged assets.
- Fence source-read, pre-AI, result-commit, failure-state and expired-lease handling by revision so a late old worker cannot revive an invalidated result.
- On explicit Analyze, recover legacy completed jobs whose invalidated result is absent by creating a new revision/job. No automatic AI retry was introduced.

After deploying only staging, explicitly confirmed one new analysis. Queue completed; real OpenRouter/google/gemini-3.8-flash returned exact OCR TEST SALE 20% and correct image facts. Result was pending review, then approved again. Original Drive bytes are restored.

### Live large-folder pagination and repeat sync — PASS

Created a synthetic subfolder Phase1 Pagination Synthetic 20261101 within the existing public test folder; sharing is inherited. Uploaded 101 generated 68-byte PNGs; Drive confirmed 101/101 uploaded. Added the separate source Phase1 Pagination Synthetic under Autopilot Drive Acceptance.

The configured Drive page size is 100. A queued sync completed automatically through two sync jobs, importing all 101 files. Catalog total became 103 including the two existing original-folder assets. Next page displayed the final three catalog items, with Previous enabled and Next disabled. A second sync also completed through two jobs; total remains 103. No Analyze request was made for these 101 files. The original source still imports direct binary children only; the subfolder itself is not imported as an asset.

The clearly named fixture source/folder is retained for repeat testing. Main Queue and DLQ metrics both read backlog_count 0 after completion.

### Verification and staging deployment

- Current targeted runtime/provider/customer suite: **28/28 PASS**, including v1 → v2 → v1 reanalysis/cache and late AI result rejection.
- Full server suite: **242/242 PASS**, Windows / Node 24.17.0. Initial broad runs failed because the isolated test copy lacked frontend/desktop fixture dependencies; after restoring those dependencies, the complete server run passed. A separate default node --test run also encountered the existing PowerShell PATH limitation; this is not claimed as passing.
- Only server storage/analysis code and its regression tests changed; frontend assets were retained byte-for-byte from the existing staging artifact.
- Staging version: `4bffc1a5-3daf-4cd6-971d-bbf336be407d`, 100%.
- Deployment: `73995bbc-af95-4fbf-9edb-c3e6c4da6bd7`, created `2026-11-01T01:45:36.26043Z`.
- Artifact SHA-256: `920c1354a6e5b005db8bfdceb5f6bdfea98106b4bde241c4bf445c6cc362c48d`, 2692820 bytes; remote readback matches.
- Upload replaced only the two exact matched compiled functions in the previous artifact; mismatched input aborts the patch. First module upload failed validation (wrong MIME type), then corrected module upload succeeded; the failed attempt did not deploy.
- Readback retained existing DO namespaces, R2, Queue and all five Secret names. No Secret values were read. Logpush and observability remain disabled; preview URLs remain disabled.
- Actual UI screenshots are saved locally, not uploaded to this repository. No main change, merge, production deploy or social publication.

### Remaining external fixture gate

**Real resource-key-required public folder: BLOCKED, not passed.** Existing runtime fixtures verify parsing and the X-Goog-Drive-Resource-Keys header. The two real synthetic folders used here do not establish enforced resource-key access. Google's documentation describes resourceKey as read-only: https://developers.google.com/workspace/drive/api/guides/resource-keys .

Required to finish this gate: an authorized synthetic public folder link containing a real resourcekey for which anonymous Drive API access without that key fails, then verify with-key ingestion and image access. A fabricated query parameter is not an acceptance substitute. OAuth is legacy and outside the user's selected public-link path. Production rollout remains separately unauthorized.
