# Web AI writing implementation — 2026-10-29

Implemented BYOK OpenAI/Gemini settings and reviewed writing suggestions in the existing Settings/composer panels. Existing desktop native requests remain in place. Web adds tone, CTA and per-platform adaptation. Applying requires unchanged source/target captions and never persists or publishes automatically.

Web credentials are AES-GCM encrypted in each workspace private credential table; no entity schema exposes keys. Cloudflare uses the existing storage key and isolated workspace runtimes. Local Node supports SOCIALCHOICE_AI_ENCRYPTION_KEY with configured Meta key fallback. Fixed provider endpoints, bounded payload/output, timeout, sanitized errors, no redirects/retries and one in-flight call per runtime.

Validation: npm test PASS 187/187; production build PASS (existing large-chunk warning). Final npm run lint, npm run typecheck and npm run typecheck:desktop all PASS. git diff --check PASS.

No live API request or online deployment. Browser automation failed to initialize (sandbox runtime error), so no desktop/mobile screenshots or visual interaction verification are claimed. Existing unrelated Facebook/account/license changes in the working tree were preserved.

Usage and setup: docs/ai-writing.md.

## Deployment follow-up - 2026-10-29

- Repeated npm test: PASS 187/187; lint, typecheck, typecheck:desktop, build and git diff --check PASS. Existing Vite chunk-size warning remains.
- Wrangler 4.149.0 deploy --dry-run PASS; actual bundle compiled with the existing three Durable Object bindings and migration configuration.
- Prepared static-only `.test-tools/ai-writing-release` from the tested dist, retaining existing Vercel project identity, API proxy/no-store rules, policies and TikTok verification file. No secrets or source workspace data are staged.
- Attempted `wrangler deploy --keep-vars`; failed before upload because the stored token could not refresh against Cloudflare auth. A direct public health request and Vercel CLI retrieval independently failed with EACCES, confirming outbound CLI access is blocked in this environment. Cloudflare connector authentication works, but it has no local-file upload path for the checked bundle; frontend CLI is also unavailable.
- No production version or frontend release was created. Previous production remains the rollback baseline: Worker `0b8aa416-3da2-426f-8bba-3f080bb55e55`, Vercel `dpl_4sbqRz72F9od7oNUHLAW7LD5gdqC` (documented prior releases; not reverified remotely in this run). Real AI provider use and authenticated online AI flows remain unverified.
- Resume from a terminal with network access: `node node_modules/wrangler/bin/wrangler.js deploy --keep-vars` with `XDG_CONFIG_HOME=D:/Socialchoice/.wrangler/config`; then `npx vercel deploy --prebuilt --prod --yes` from `.test-tools/ai-writing-release`. Run `node scripts/web-license-live-check.mjs --enabled` from the repository root and verify anonymous AI POST returns 401. Do not replace encryption keys or namespaces.
