# OpenRouter public review — 2026-11-01

Reviewed baseline: da3ad4a2f2da986b58bddf662532bb34c34f15f2.

Preserved the user's HTTP-Referer and X-Title headers in writing, vision and private egress. Public settings currently use OpenRouter / openai/gpt-4o-mini; no key or model was changed during this review.

## Repairs

- Share the fixed provider-reason allowlist across server and browser; arbitrary uppercase strings from a proxy no longer pass the browser diagnostic boundary.
- Classify only top-level provider error messages and bounded JSON upstream error messages. Echoed prompts, arbitrary metadata and non-JSON raw bodies cannot claim a geographic, billing or leaked-key cause.
- Match explicit geographic rejection phrases rather than any occurrence of country/territory.
- Explain fixed rejection categories in Vietnamese, including geographic restrictions, workspace data regions, account restrictions, budgets and policy blocks.
- The saved API card reflects a successful or failed test in this page session. Reload/save invalidates its local verification state.
- Disable the card's test action while the form differs from the saved configuration, matching the main test action.
- Give the visible error an alert role.

## Validation

269/269 server tests passed, including Worker/R2/Queue/private actor fixture and regressions for metadata contamination and forged diagnostic reasons. ESLint, TypeScript and production Vite build passed.

## Live boundary

A real public connection test against the user's saved GPT-4o-mini configuration still returned HTTP 403 / GEOGRAPHIC_RESTRICTION before this repair deployment. The workspace guardrail overview showed budget, model/provider, prompt-injection and sensitive-info policies as Not configured. This does not establish which provider/account/network rule rejected inference. Do not claim that adding attribution headers or selecting a US Durable Object solved the geographic restriction.

No social post was published; no API key, model, provider guardrail or account permission was changed. Acceptance with 20 approved distinct valid images and a full 30-day real-provider plan remains unverified.
