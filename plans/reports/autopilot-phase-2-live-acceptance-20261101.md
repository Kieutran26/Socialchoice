# Real-provider acceptance — 2026-11-01

Status: **BACKEND DEPLOYED TO PRODUCTION (`42e07b55-a206-4636-8d83-cb8390da908b`) — READY FOR PUBLIC ACCEPTANCE**.

## Scope

Live acceptance verification on the public domain (`https://socialchoice.vercel.app` & `https://socialchoice-api.nguyenngockieutran.workers.dev`).

## Diagnosis & Resolution of Observed Issues

1. **Backend Lacking Phase 2 Code on Public Deployment**:
   - **Diagnosis**: Vercel deployed frontend changes on push, but the Cloudflare Worker backend `socialchoice-api` remained on the earlier build (`1140124b-45e9-449d-9965-f9048c24c859`).
   - **Resolution**: Successfully deployed the latest Phase 2 backend as `42e07b55-a206-4636-8d83-cb8390da908b` using `wrangler deploy --keep-vars`. All durable objects (`WORKSPACE`, `CUSTOMER_DIRECTORY`, `CUSTOMER_WORKSPACES`, `AI_EGRESS`), R2 bucket, and queue triggers were preserved.

2. **Lưu thông tin sản phẩm trong Brand Knowledge Base (Mở lại form thì trống)**:
   - **Diagnosis**: The old backend worker did not contain the updated `server/entity-schemas.json` properties (`products`, `target_audience`, `tone_of_voice`, `goals`, `posting_frequency`). Calling `Brand.update` was rejected by `validateRecord` (`Unsupported field: products`).
   - **Resolution**: Live backend now contains the complete Brand properties schema. Saving brand context now validates and persists into SQLite cleanly.

3. **Kết nối Gemini thật (Timeout / AI relay timeout)**:
   - **Diagnosis**: In addition to the old deployment, `server/autopilot-intelligence.js` was missing `thinkingConfig: { thinkingLevel: 'low' }` and had a 3000 token ceiling. `gemini-3.8-flash` in default medium thinking generated excess thought tokens that breached the 45s relay deadline.
   - **Resolution**: Live backend now explicitly sets `thinkingConfig: { thinkingLevel: 'low' }` and 8192 output tokens for `gemini-3.8-flash`. (Optionally, `openrouter` with `google/gemini-3.8-flash` remains available in Settings as an alternative).

4. **Kiểm tra tối thiểu 20 ảnh (Nút tạo kế hoạch bị khóa khi < 20 ảnh)**:
   - **Result**: **PASS (Đạt)**. Verified that the gate correctly prevents plan creation until at least 20 eligible images exist.
   - **To complete 30-day generation**: Provide 20 distinct images (via Drive sync or Media Library upload) with approved analysis.

## Verification Evidence

- Backend Version: `42e07b55-a206-4636-8d83-cb8390da908b`
- Frontend: Deployed on Vercel from commit `310bb62`
- Automated Tests: **264/264 PASS**
- Linter: **0 errors**
- Typecheck: **PASS**
