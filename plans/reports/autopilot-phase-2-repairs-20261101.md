# Phase 2 repair follow-up — 2026-11-01

## Result

Local code repairs verified. Full server suite: **264/264 passed**, zero failed or cancelled. Typecheck and Vite build pass. Live acceptance remains open; no deployment or provider configuration change was made in this follow-up.

## Image eligibility repaired

The strategy backend again requires `storage_id` and actual private image chunks for uploaded images. A `file_url` alone is metadata and never satisfies the 20-image gate. This matches the existing frontend requirement. Available, approved Drive/R2 catalog images remain supported through their version-checked import path.

The new regression case proves that 20 URL-only records are rejected before any provider request; adding 19 stored images is still rejected; adding the twentieth stored image succeeds and selects only real private images. No external URLs are fetched by this eligibility check.

## Reproduced deadline gaps repaired

Before the repair, two new tests timed out rather than returning a controlled failure:

- A regional provider returned headers but its body stream never produced data and ignored cancellation.
- A Durable Object actor call never returned and ignored its caller's abort signal.

`awaitAiIo` now bounds our own wait using the existing signal, removes listeners when settled, and disposes late responses. Regional actor calls, provider header fetches and body reads use this guard. Direct OpenAI/OpenRouter writing and image-analysis calls also apply the same request deadline to fetch and JSON reading. No deadline extension, automatic uncertain retry or direct Gemini fallback was introduced.

Safe diagnostic `ioStep` values distinguish `actor_request`, `provider_headers` and `provider_body`. Only this fixed allowlist can cross the HTTP boundary or be persisted in Autopilot job diagnostics. Credentials, prompts and provider error bodies remain excluded.

This is a confirmed repair of reproducible I/O-hang cases. It is **not proof that these cases caused the prior production Gemini timeout**, nor proof of provider availability or successful live analysis.

## Validation

- Targeted strategy, relay, writing and Autopilot regression run: 63/63 passed before the diagnostic addition.
- Final full server suite including diagnostics: 264/264 passed.
- Typecheck: passed.
- Vite build: passed; pre-existing large-chunk warning remains.
- Lint: passed, zero errors.
- Diff whitespace check: passed (Git emitted only its line-ending normalization notices).

## Remote state verified read-only

Cloudflare API metadata shows an AI_EGRESS binding in both environments. The active deployments predate these local repairs:

| Environment | Active version | Deployed UTC |
|---|---|---|
| Production `socialchoice-api` | `1140124b-45e9-449d-9965-f9048c24c859` | 2026-11-01 05:28:52 |
| Staging `socialchoice-autopilot-staging` | `61590bad-2923-4aec-ae7f-1e0258c3d261` | 2026-11-01 03:20:54 |

No remote settings, bindings, credentials or resources were modified. Existing staging build artifacts are not evidence that these repairs were deployed.

## Remaining live gates

Deploy the reviewed repairs to the existing isolated staging environment, obtain an authenticated staging session, and run the real configured provider against at least 20 distinct validated images. Check output quality, 30-day planning, edits, atomic/repeated apply and zero publication jobs. The known missing authenticated staging session and insufficient production image set remain separate from local code correctness.
