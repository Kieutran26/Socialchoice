# Web AI writing

In Settings choose OpenAI or Google Gemini, enter a model ID available to your API account and your own API key. Save, then optionally test the connection (uses API quota). Saving does not validate credentials. A blank key keeps the existing key only for the same provider. Remove AI key deletes the stored credential.

In Create Post choose a brand and optionally a Pillar/Angle. The assistant supports writing from a brief, rewriting, shortening, five ideas, tone, CTA and adaptation for Facebook, Instagram, LinkedIn, Threads or TikTok. Specify audience, objective, message and tone in the brief. Output can be Vietnamese or English.

Generate sends the brief, title, shared caption, selected brand name/description and selected Pillar/Angle name/description through Socialchoice to your provider. Media, credentials and unrelated posts are not sent. Your provider bills your API account.

Review before applying. Normal tasks update the main caption; adaptation updates only the selected platform caption. Account-specific captions retain precedence. Source or target caption changes block stale suggestions. Applying never saves, schedules or publishes; save the draft separately. Existing Channel checks and publishing review remain authoritative. AI text still needs fact checking.

## Runtime and credentials

Web keys use AES-256-GCM in the private credential store, excluded from entity APIs and settings responses. Cloudflare uses SOCIALCHOICE_STORAGE_KEY within each existing isolated customer workspace database. Owner and customer keys remain separate. No new storage service is introduced.

Local Node uses server-only SOCIALCHOICE_AI_ENCRYPTION_KEY (64 hex characters), falling back to the configured Meta encryption key. Keep it stable and back it up privately. Missing encryption configuration disables AI explicitly. Never put secrets in VITE_* variables. After an encryption-key change, remove and re-enter AI credentials.

Provider calls use fixed HTTPS endpoints, reject redirects, time out after 45 seconds, bound input/output and allow one active request per workspace runtime. Incomplete, empty or refused output is rejected. Errors are sanitized; no automatic retry. A timeout does not prove the provider did not charge your request.

Desktop keeps native provider calls and Windows-protected keys. Web credentials are separate. Tone/CTA/platform adaptation tasks are web additions.

## Verification boundaries

Tests cover encrypted credentials, workspace isolation, selective context, strategy ownership, both provider formats, sanitized failures, concurrent requests, stale apply and HTTP authentication/origin/header/body boundaries. Provider calls are mocked; real API success remains unverified. Browser visual checks were unavailable because the automation runtime failed to initialize.

Release verification repeated on 2026-10-29: 187/187 tests, lint, web/desktop typechecks, production build and Wrangler dry run passed. Production deployment remains blocked: this execution environment denies outbound CLI connections (EACCES), preventing Cloudflare token refresh and Vercel CLI retrieval. No production update succeeded. The static-only frontend release is prepared under ignored `.test-tools/ai-writing-release`; the checked Worker bundle is under `.test-tools/ai-worker-dry`. Deploy the backend with existing bindings and `--keep-vars`, then the frontend, and verify deployed hashes and AI authentication boundaries before declaring the release complete.

References: [OpenAI Chat Completions](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create), [Gemini API](https://ai.google.dev/api).


Provider refusal diagnostics (29 October 2026): the server now reads bounded provider error JSON and returns fixed, localized explanations for invalid/blocked keys, unavailable models, permission restrictions, billing, quota, unsupported server regions and provider outages. Raw provider messages and keys are never returned. Requests are not retried automatically. This improves diagnosis; it does not establish the cause of any existing production refusal or prove successful live generation.


## Gemini server region

Hosted Gemini generation and connection tests now use the private AI_EGRESS binding to a separate SocialchoiceAiEgress actor in the Cloudflare US jurisdiction. This actor performs only fixed-endpoint Gemini requests, does not write storage, and exposes no public relay route. API keys and prompts are passed transiently over the private binding; keys remain encrypted in the original workspace. Existing workspace placement, records, identities and encryption keys are unchanged. OpenAI and local Node behavior are unchanged. The provider remains the authority on accepted egress geography; a live owner test is required after rollout.

Deployment appends the ai-us-egress SQLite class migration. Preserve that class/binding when rolling back subsequent versions; do not reset or move existing workspace namespaces. No paid service or external proxy is introduced.

## Troubleshooting AI 502

Open Settings → AI with your own API key. Save the provider, exact model ID and key, then choose **Test AI connection (uses API quota)** beside Save AI settings. The test button stays disabled while settings are unsaved. Share only the displayed error or sanitized error metadata; never share the request headers, key, cookies or prompt.

AI errors retain the fixed human-readable `message` and add `stage` and `code`. `stage: binding` / `AI_BINDING_UNAVAILABLE` (503) means namespace lookup failed before calling the relay. `stage: relay` identifies private actor transport failure (502) or timeout (504). `stage: provider` identifies a provider rejection, redirect, invalid/incomplete output, connection failure or timeout. When a response was received, `providerStatus` records its HTTP status; a Google 400/403/429 remains an upstream rejection even though the application returns 502. No raw provider error is exposed. The frontend reports invalid/HTML/empty gateway responses safely with `stage: proxy`, retaining the HTTP status; it never displays raw proxy bodies. Requests are never retried automatically.

Live investigation on 2026-10-29 verified production Worker `0c67d46f-1a45-45a6-905c-57cbae72ab58` has AI_EGRESS. A temporary remote preview invoked its existing US actor with an intentionally invalid key and received Google JSON HTTP 400. This proves the binding and relay can reach Google; it does not prove a real key/model is accepted or establish the original 502 cause. Both public frontend and backend returned health 200 and anonymous AI status 401 with JSON/no-store. The preview was stopped; customer settings, storage and credentials were untouched. These checks describe the existing deployment, not deployment of this repair. Original authenticated failure and successful generation remain unverified.
