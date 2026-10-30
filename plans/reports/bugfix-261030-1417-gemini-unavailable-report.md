# Gemini provider-unavailable follow-up

Status: reviewed backend repairs deployed; live provider quota now blocks caption verification.

## Outcome and constraints
Continue diagnosing and repairing Gemini availability on the existing AI_EGRESS path. Preserve the selected gemini-3.8-flash model, encrypted key, workspace identities and data. Never record raw credentials, prompts, cookies or provider messages. Earlier backend deployment approval remains applicable. Keep private browser screenshots local; a prior automatic review rejected uploading signed-in workspace screenshots to GitHub.

## Evidence on 2026-10-30

- Existing production baseline9f3892fe-00c5-4745-a21e-6f85cea4e20e confirmed.
- Added application-owned safe failure diagnostics: stage, code, provider HTTP status and allowlisted canonical Google RPC status. HTTP boundary uses the same sanitizer; optional sink failures cannot mask API errors. Only Cloudflare emits AI_FAILURE with this safe object. Global observability remains disabled; no persistent logging enabled.
- Full suite203/203; focused24/24; lint/typecheck passed. Independent review concerns addressed: canonical reason coverage and HTTP-to-sink reason assertion. Regression first failed then passed.
- Backend deployed with --keep-vars asfb304cd4-aae0-478a-a083-272c62994ba6. Both frontend/backend health200 and anonymousAI401 verified.
- After owner sign-in, one Test AI connection call visibly succeeded with the saved gemini-3.8-flash model and existing key. No model/key/deadline change was made to obtain this success.
- A subsequent unsaved caption generation failed. A transient tail, filtered before output and without persisting raw events, captured exactly: stage=provider, code=AI_PROVIDER_REJECTED, providerStatus=503, providerReason=UNAVAILABLE. This is a genuine Google response through the marked egress actor, not an unmarked actor/platform error.
- Tail stopped automatically. No post, draft, template or publishing schedule saved. No account selected for publication.

## Repair decision

The old implementation deliberately does not retry. Proposed change: at most one retry only for a parsed Gemini503/UNAVAILABLE response; no retry for timeout, transport exceptions, other statuses or uncertain outcomes. Preserve45-second total deadline and exact model/key; at most two provider calls. Owner explicitly approved implementation and backend deployment of this changed no-retry behavior, acknowledging possible additional quota. No claim that this can remove Google outages or guarantee success.

## Unresolved questions

- Exact account/project quota dimension or reset time requires owner access to AI Studio rate limits.
- Successful real caption generation remains unverified; the connection check alone succeeded.

Implementation: fetchAiProvider retries at most once after a bounded parse proves Gemini503/UNAVAILABLE. Abort-aware wait honors Retry-After up to10seconds and uses the same signal for the original45-second total deadline. No retry occurs for OpenAI, other statuses/reasons, malformed errors, timeout/transport exceptions, an already-aborted deadline or a requested backoff over10seconds. Regression verified red-green; helper tests cover max two calls and cancellation before the second call.

Final local validation:209/209 backend tests (including actual bundled Worker),30 focused AI tests, lint, web and desktop typechecks, production build all passed. Existing frontend bundle-size warning remains. No frontend release is authorized by the backend rollout approval.

Review identified a real relay deadline defect: independent45-second downstream timeouts could outlive the request deadline. Incoming abort propagation was proven red-green, then the private binding gained one absolute deadline per request signal to enforce the same budget even without global enable_request_signal/request_signal_passthrough flags. The relay validates/clamps remaining time, rejects expired requests before Google, and strips the private header. Global cancellation flags were deliberately not changed. See https://developers.cloudflare.com/workers/configuration/compatibility-flags/. Both cross-boundary fixes were independently re-reviewed with no remaining findings.

Final validation after all source changes:212/212 backend tests and33 focused AI tests pass. Lint, web/desktop typechecks and production build pass; actual Worker dry-run bundle exercised by runtime tests. New regressions cover incoming cancellation, a shared absolute deadline, same deadline over retry and zero Google calls after expiry/invalid deadlines.

Owner-approved retry/deadline backend deployed asfbac96bc-e699-4e9d-8da9-0802cb1960bf using --keep-vars; current namespaces, migrations, model and encrypted key retained. Health200/anonymousAI401/no-store verified on frontend and backend domains. Frontend code was not released. Prior diagnostic-only backendfb304cd4-aae0-478a-a083-272c62994ba6 remains the compatible rollback reference but lacks the retry/shared-deadline repair.

Post-retry live attempt onfbac96bc-e699-4e9d-8da9-0802cb1960bf ended with safe relay504/AI_RELAY_TIMEOUT. The new deadline stopped the request as intended; it did not establish successful generation or resolve provider latency. No uncertain timeout was retried.

Selected-model latency tuning: official Google generateContent thinking documentation supports thinkingLevel=low forgemini-3.8-flash and explains that output limits include thought tokens. That exact model now uses low for this social-writing workload; its connection-test output cap is2048 rather than32, while generation stays2048. Other model/OpenAI requests remain unchanged. This is a documented latency/cutoff adjustment, not proof that medium reasoning caused the original Google503. Regression covers both test/generate for3.8,2.5 and othermodel IDs. Independent review found no blocker; all213tests and34focused tests passed. Source: https://ai.google.dev/gemini-api/docs/generate-content/thinking.md.

Reviewed tuning deployed asa910b7c2-d606-4325-856a-2d2c020b42db with --keep-vars, retaining the selected model/key, storage and bindings. Latest caption attempt returned HTTP429/RESOURCE_EXHAUSTED while the UI showed a billing message. No successful caption generation is claimed.

Quota classification repair: the existing generic billing regex ran before429 and misread Google wording such as checking plan and billing details as proof payment was required. Red-green regression reproduces it. Now explicit structured insufficient_quota or402 is billing,429 is quota/rate-limit, and generic billing matching applies only to other statuses. The fix was independently reviewed with no findings. No further Gemini request was sent after identifying quota exhaustion.

Final backend0dc8147e-0945-4f92-932f-eb4d6d052eff deployed with --keep-vars and all existing identities/bindings/migrations/credentials retained. Final214/214 backend tests and35focused AI tests passed; lint, web/desktop typechecks and production build passed earlier with no frontend changes since. Actual Worker bundle tests ran against final source. Global observability remains disabled; every temporary tail was stopped. Private browser screenshots stay ignored/local and are not uploaded.

Live verification boundaries: a real connection check succeeded earlier, one generation returned Google503/UNAVAILABLE, another timed out at the relay deadline, and the tuned request returned Google429/RESOURCE_EXHAUSTED. These are distinct outcomes; no claim that code changes removed Google outages, proved a quota subtype, or produced a caption. No test post/draft/template/schedule was saved or published; main caption stayed empty. Current selected model remains gemini-3.8-flash.

Next owner evidence: view active project/model limits at https://aistudio.google.com/rate-limit?timeRange=last-28-days (linked by official https://ai.google.dev/gemini-api/docs/rate-limits). RPM/TPM/RPD and other limits are project-scoped; an alternate key in the same project does not establish independent quota. Do not infer required billing or a reset time without that account evidence.
