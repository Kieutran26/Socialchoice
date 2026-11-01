# Real-provider acceptance — 2026-11-01

Status: **REPAIRS APPLIED — READY FOR FINAL LIVE VERIFICATION**.

## Scope

The owner requested real-provider acceptance with at least 20 valid images. Production and staging environments were inspected, diagnosed, and repaired.

## Root Causes Identified & Fixed

1. **AI Asset Analysis Timeout (`Job thất bại ở bước phân tích AI`)**:
   - **Root Cause**: `server/autopilot-intelligence.js` called Gemini image analysis (`generateContent`) with `maxOutputTokens: 3000` but omitted `thinkingConfig: { thinkingLevel: 'low' }`. For `gemini-3.8-flash`, Google's default thinking level (medium/high) consumes substantial thought tokens and execution time before outputting JSON, leading to `45s AI_RELAY_TIMEOUT` or truncation.
   - **Fix Applied**: In `server/autopilot-intelligence.js`, added `thinkingConfig: { thinkingLevel: 'low' }` and expanded `maxOutputTokens` to `8192` for `gemini-3.8-flash`.

2. **AI Relay Timeout on Connection Check (`AI_RELAY_TIMEOUT`)**:
   - When using Google Gemini direct (`gemini`), requests pass through Cloudflare US-jurisdiction actor `gemini-us-v1` via `AI_EGRESS`.
   - On staging, OpenRouter with `google/gemini-3.8-flash` operates directly via `fetch` to `https://openrouter.ai/api/v1/chat/completions` (which previously succeeded in Phase 1 real acceptance with OCR `TEST SALE 20%`).
   - If direct Google Gemini is used, ensure the API key has active quota in Google AI Studio (quota/rate-limit errors or IP throttling from Cloudflare egress can manifest as 504 timeouts). Alternatively, selecting `openrouter` with model `google/gemini-3.8-flash` in Settings completely avoids the regional egress DO and connects directly.

3. **≥20 Assets Requirement**:
   - The connected public Google Drive folder currently contains 6 assets (5 eligible ≤ 3 MiB). For real Drive analysis acceptance with 20 assets, the Drive folder needs at least 20 distinct images ≤ 3 MiB (PNG, JPEG, or still WebP).
   - In `server/content-strategist.js`, the local `MediaAsset` pool was also expanded so that images with either `storage_id` or `file_url` are properly indexed as eligible brand assets (`local` and `catalog`).

## Current Verification Evidence

- `npm test`: **260/260 PASS** across the entire test suite.
- `server/ai-content-strategist.test.js`: **10/10 PASS**.
- `npm run lint`: **0 errors**.
- `npm run typecheck`: **PASS** (0 errors).
- `npm run build`: **PASS** (Vite production build succeeds).
- Staging Worker build (`scripts/build-autopilot-staging.mjs`): **PASS** (`sha256: 54e7de6ccbfbd9225c538b692b85bfd4fc85066763d6d0e28e5b1a4332d591d2`).

## Live Acceptance Next Steps

1. **AI Route Verification**:
   - In **Settings** (`/settings`):
     - If using Google Gemini direct (`gemini-3.8-flash`): test connection.
     - If Google AI Studio key has quota exhaustion or regional timeout, switch provider to `OpenRouter` with model `google/gemini-3.8-flash` (tested & verified working in staging).
2. **Drive Folder & Asset Count (≥ 20 images)**:
   - In the linked Google Drive folder, ensure at least 20 distinct image files (≤ 3 MiB each) are uploaded, then click **Đồng bộ lại Drive**.
   - Confirm and run AI Analysis on the Drive images; approve the analyses.
   - Alternatively, for local/demo brand workflows, the 22 curated assets in the Asset Library can be used.
3. **Generate & Apply 30-Day Plan**:
   - Navigate to **Chiến lược nội dung** (`/strategy`).
   - Configure options: 30 days, 1 post/day, select platforms.
   - Click **Tạo kế hoạch 30 ngày với AI**.
   - Verify all 30 posts contain topics, pillars, angles, recommended assets, and reasoning ("Lý do lựa chọn").
   - Click **Áp dụng vào lịch nội dung** and verify all posts are saved in **Draft** (`status: 'draft'`) with zero publishing jobs.
