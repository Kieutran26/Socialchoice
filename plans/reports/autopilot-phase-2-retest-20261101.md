# Independent retest after the reported repairs

Date: 2026-11-01 (Asia/Ho_Chi_Minh)

Verdict: **NOT READY for full live acceptance**. Existing automated checks pass, but a newly reproduced eligibility defect remains and production Gemini still times out.

## Checks performed

| Check | Result |
|---|---|
| Full current server suite | 260 passed, 0 failed |
| Lint | Passed |
| Typecheck | Passed |
| Vite production build | Passed; existing large-chunk warning |
| Actual Gemini vision request configuration using an intercepted outbound fixture | Includes JSON output, `maxOutputTokens: 8192`, and `thinkingConfig.thinkingLevel: low` for `gemini-3.8-flash`; response validation passes |
| Production Settings connection test with the existing Gemini configuration | Failed again: “Tuyến chuyển tiếp AI hết thời gian chờ. Kiểm tra nhà cung cấp trước khi thử lại.” |
| Staging live provider retest | Blocked: opening staging Settings shows the admin sign-in form; no authenticated staging session is available |
| Existing staging OpenRouter evidence | Historical Phase 1 evidence records successful OCR `TEST SALE 20%` on one synthetic image, not a new Phase 2 or 20-image pass |

## Reproduced defect: arbitrary URL records satisfy the 20-image gate

`server/content-strategist.js` now accepts local MediaAsset records with either `storage_id` **or any nonempty `file_url`**. This does not validate that external URLs contain an accessible or supported image, and does not import their bytes. The current frontend still counts only local records with `storage_id`, so the client and server disagree.

An isolated in-memory reproduction created 20 live-brand MediaAsset rows pointing to distinct nonexistent `https://example.invalid/...jpg` URLs. A stub provider returned structured captions so this check isolated eligibility and saving rather than model quality. The observed result was:

```json
{"invalidExternalUrls":20,"aiCalls":1,"generated":30,"savedDrafts":30,"storedImages":0}
```

No network request, real provider charge, production record or publication was involved in this reproduction. It proves that passing the current tests and counting external sample URLs do not establish 20 valid images. Restrict this pool to validated private images, or implement a bounded, secure import-and-validation path before counting external images.

## Limits of the timeout diagnosis

The reported thinking/token change is present in source and its request shape was verified. No before/after provider trace or successful new live response was available to prove that omitted thinking settings caused the earlier relay timeout. Production's connection probe still fails and uses the writing path, rather than the modified vision generation configuration. The repair therefore cannot yet be called a confirmed live fix for the connection failure.

The staging build script invokes Wrangler with `deploy --dry-run`; a successful bundle hash establishes a build, not a deployment. No new deployment was performed in this retest.

## Remaining acceptance gates

1. Correct the server image-eligibility defect and add a negative regression test for external URL-only records; preserve agreement between client and server counts.
2. Obtain a successful real response through the configured AI route in the environment containing the reviewed code. Staging currently needs an authenticated session.
3. Supply at least 20 distinct validated private images or approved, available Drive/R2 images. The production catalog still shows six assets, one over 3 MiB, with no approved analysis from the earlier run.
4. Generate and review a 30-day plan using the real provider, then check edits, atomic saving, repeated apply and zero publishing jobs in an isolated acceptance workspace.

Only this report was added during the retest. No application implementation, production provider settings, credentials, deployments or post data were changed.
