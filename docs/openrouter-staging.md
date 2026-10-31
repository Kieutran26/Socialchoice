# OpenRouter staging integration

OpenRouter is available in web Settings and Asset Intelligence on feature/autopilot-phase-1. Desktop native integration is unchanged.

Select OpenRouter, choose an image-capable model, enter an OpenRouter API key directly in the protected Settings form and save. Changing providers requires a new key; a stored Gemini/OpenAI key is never silently reused. Existing saved configuration stays active until a successful save. The masked card now says configured, not verified active.

The authenticated models operation reads the fixed https://openrouter.ai/api/v1/models endpoint without a user key. Responses are bounded to 8 MiB, sanitized to IDs, names, vision flags and optional prices, and cached for five minutes per runtime. The picker shows image-capable text-output models and excludes batch/non-chat endpoints. An initial real catalog call returned 433 text models, 289 image-capable before final endpoint filtering; this is a point-in-time count, not a service guarantee.

Writing and image requests use only https://openrouter.ai/api/v1/chat/completions with Authorization bearer, manual redirects, deadlines, bounded response handling and max_tokens. OpenRouter model IDs support provider/model and variant syntax. Automatic provider fallback is disabled. No model-switch retry or application retry was added. Catalog eligibility does not prove key entitlement or successful generation.

Image analysis retains explicit confirmation, strict JSON validation, provider/model/version caching and human review. Images/prompts pass through OpenRouter to its selected provider. Provider costs apply. Credentials stay encrypted in the existing workspace vault and are never returned by status/models.

Gemini relay follow-up: the private regional actor now completes a bounded response read before returning to the workspace, and image generation requests use Workers-compatible manual redirects. A real Gemini test reached provider HTTP 503; no successful Gemini image analysis is claimed. Temporary diagnostic logging was removed.

## Validation

- Full server suite: 238/238 PASS before the final model-picker endpoint filter; focused OpenRouter suite 3/3 PASS after that filter.
- Build, lint, typecheck: PASS; final build passes with the existing large chunk warning.
- Live unauthenticated OpenRouter catalog retrieval: PASS, no API key used.
- Authenticated staging Settings: OpenRouter option and live vision-model list render; Gemini 3.8 Flash selected in the unsaved form.
- Follow-up live acceptance (2026-10-31): user saved OpenRouter key directly in staging Settings. Masked status confirms OpenRouter / google/gemini-3.8-flash stored encrypted. Agent ran the connection test and observed “Đã kiểm tra kết nối AI thành công.”
- Public Drive test source contains two assets, including gemini-acceptance-test.png (synthetic marketing test image, 3.7 KB). Agent confirmed and queued analysis of this synthetic image. Background Queue transitioned from pending to failed; asset remains failed / pending human review. UI reports only “Cần kiểm tra nguồn hoặc cấu hình”; no specific provider failure is established.
- Connection authentication test PASS. Real image analysis FAIL; successful OCR, cache and approval acceptance remain pending. No failed result was approved and no publishing was performed. Do not mark Asset Intelligence accepted based on the connection test.

Final staging version: bc66c619-58ba-4829-b365-93b283463e74.
Production/main unchanged. Existing staging secrets and R2/Queue bindings retained; no production credential was copied. No merge or production deployment.
