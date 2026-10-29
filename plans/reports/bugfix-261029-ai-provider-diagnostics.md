# AI provider refusal diagnostics

Owner requested continuing AI troubleshooting. Existing refusal text did not distinguish upstream failures; the actual production cause remains unverified.

Changes: bounded JSON decoding; fixed safe classifications for invalid/blocked keys, model availability, API permissions, billing/quota, unsupported server region, malformed parameters and outages. Raw provider messages are never exposed. No automatic retries, model changes or credential changes. Added Vietnamese translations and two regression tests covering error categories, non-JSON/oversized bodies and key privacy.

Validation: 190/190 backend tests, 11/11 AI tests, lint, web/desktop typecheck, Vite build and Wrangler bundle dry-run passed.

Backend deployed with --keep-vars: a503db13-deb0-410a-a679-5a0b4f842001. Public app API health returned 200; unauthenticated AI status returned 401. Existing bindings retained. Actual owner-authenticated provider test still required; no successful live generation claimed.

Frontend deployed: EFKXXXFVAfayoR9irHg1iQEj2khB, production alias socialchoice.vercel.app. Deployed main JavaScript SHA-256 matches the tested build; API health 200 after frontend rollout.
