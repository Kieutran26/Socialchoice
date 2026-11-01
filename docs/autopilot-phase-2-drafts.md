# Autopilot Phase 2 — single-image Facebook drafts

Date: 2026-11-01 (Asia/Ho_Chi_Minh). Status: implemented and verified on staging for the draft workflow. This is the first Phase 2 increment, not acceptance of batch production, automatic publishing or production rollout.

## User workflow

1. In Media Library, choose a live brand and an available image with approved analysis.
2. Select Create Facebook draft. Unanalyzed, unapproved or unavailable assets cannot start this flow.
3. Enter a goal, tone, verified facts, optional CTA and Vietnamese/English output language.
4. Explicitly consent to sending the approved analysis and brief to the configured AI provider. Charges may apply.
5. Review/edit the caption and internal title.
6. Select Save draft and open editor. The source image is copied into existing private media storage and an ordinary editable draft opens.
7. Select a connected Facebook Page in the existing composer, choose time and complete its existing publication/scheduling confirmation. Draft generation never selects accounts, schedules or publishes.

Only the approved text analysis and brief are sent for this writing request; original image bytes are not sent to AI again. The image is read from its original source only when saving the reviewed draft. Source access and exact version are checked through the existing Drive/R2 provider before import.

## Implementation

- New private SQLite table autopilot_drafts, not writable through generic entity APIs.
- generateDraft requires explicit consent, a UUID request ID, live approved analysis and bounded inputs. Context is assembled on the server from that workspace's asset.
- Reuses existing encrypted AI configuration, fixed provider endpoints, deadlines, bounded responses and safe errors. No new provider credentials or dependencies.
- A repeated identical request ID returns an existing ready result; running/failed requests are not automatically submitted again. Changing the brief under an existing ID is rejected. A new UI generation requires another explicit consent.
- Asset ID, binary version, analysis revision/key and source generation are snapshotted. Changes during generation or before/during image import reject the result/save.
- saveAssetDraft uses a transaction for the private image, ordinary Post draft and saved receipt. Repeating save returns the original post. Account IDs are empty, scheduled_at is null and status is draft, regardless of forged scheduling/publication fields.
- Existing composer, scheduler and publication confirmation remain the delivery path. OpenRouter is now labeled correctly in the composer.
- UI reuses Dialog/Input/Textarea/Button, semantic tokens and Vietnamese translations; no global style change.
- No changes to production Wrangler configuration, main or publishing alarms.

## Verification

| Check | Result |
|---|---|
| Full server suite | PASS 250/250, Node 24.17.0 on Windows |
| New draft unit/integration tests | 8 PASS: consent/approval, idempotency, source/analysis changes, stale completion, private media and draft-only save, failure/no resubmission, foreign IDs and two-workspace isolation |
| Actual workerd + SQLite + R2 + Queue + HTTP | PASS, including generated draft, repeat request/save, private image read and no PublishJob; external Drive/OpenRouter responses are fixtures |
| Existing two-customer authenticated runtime | PASS as part of server suite; no new live two-customer cloud test is claimed for these draft endpoints |
| Lint / typecheck / Vite build | PASS; existing large-bundle warning remains |
| Anonymous live generateDraft/saveAssetDraft | Both return 401 |
| Real generation | PASS, one confirmed request using openrouter / google/gemini-3.8-flash and existing synthetic approved Drive image |
| Real content quality | Caption correctly calls image a layout test and explicitly says there is no real discount, despite OCR TEST SALE 20%; includes requested invitation for feedback and relevant hashtags |
| Review and save | Manually changed title and appended a staging-only note, then saved; existing editor opened with exact edited caption and one attached image |
| Image privacy and bytes | Live image loads at natural width 640px; anonymous request to imported image returns 401. Runtime fixture compares exact bytes |
| Persistence | Reload after final deployment retains title, edited caption and image; provider label is OpenRouter |
| Mobile dialog | 390px viewport, dialog 358px wide, document scrollWidth = clientWidth = 390; controls visible and save completed |
| Scheduling boundary | Existing composer reports no connected destinations for test brand. Clicking Schedule is rejected with Select at least one destination. No publication was confirmed |
| Deployment integrity | Bundled checksum verified before upload and by remote readback. Existing namespaces, R2, Queue and all five Secret names preserved; Secret values never read |
| Cleanup | Both sets of 20 temporary build-part objects removed after verified uploads; isolated test Worker's public endpoint remains disabled |

The real generation was performed with a synthetic test image/brief. No independent provider usage/billing counters were inspected, so an exact provider-side request count or cost is not claimed. UI screenshots are local evidence, not published to GitHub.

## Staging evidence

- Branch: feature/autopilot-phase-1.
- Feature commit: ae00e9b862c39ef93dc57692c393bd9e628919db.
- Composer provider-label repair: 9c72fab6b158eb8a315efbf0ff3a2600b2d77676.
- Worker: socialchoice-autopilot-staging.
- Final version: 61590bad-2923-4aec-ae7f-1e0258c3d261 at 100%.
- Deployment: 2574f272-0872-4822-af83-8f7b006bda78.
- Created: 2026-11-01T03:20:54.176582Z (10:20:54 Vietnam).
- Artifact: 2199788 bytes; SHA-256 b5e2fd7f7853f423a45b5288fe7c56fb3d16becdef671e905616df1ee404aa55.
- The earlier Phase 2 version 19b575ed-cf7f-4689-ae96-2389c35877a7 was superseded only to fix the provider label. Draft API code is unchanged in the final version.
- Logs/observability and preview URLs remain disabled. The optional historical simulated preview artifact is not bundled in this increment.
- [Saved synthetic acceptance draft](https://socialchoice-autopilot-staging.nguyenngockieutran.workers.dev/create?edit=31bf683b-6b73-4076-99c2-29cfddf2563c) requires staging authentication.

## Limits and next acceptance

This increment supports one approved image and one Facebook caption per confirmed request. No batch generation, recursive Drive scan, video writing, auto-account selection or automatic scheduling is added. Other platforms remain available through the existing composer but do not receive a new image-draft generation flow here.

New draft receipts are bounded at 1000 records per workspace; history cleanup/recovery UI is not included. Existing private media quota is 200 MiB and image limit is 3 MiB. Saving makes a private snapshot copy; later Drive changes do not mutate an already saved post's attached image.

Real Facebook schedule/publication remains untested in this increment because the synthetic brand has no connected Page. A real authorized Page and exact content/time confirmation are required for that separate acceptance. No production release or merge is authorized. The Phase 1 resource-key exception remains unchanged.
