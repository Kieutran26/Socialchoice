# Online backend preparation validation

Implemented preparation: single Node hosted listener with fail-closed authentication/storage guard; configured backend Host acceptance with app Origin checks; pinned Node/pnpm Render manifest, 1GB disk; exact Vercel API rewrite helper with no-store/cache-off and rollback copy. Active vercel.json routing unchanged pending real backend URL.

Checks: 28 tests pass via pnpm; lint, typecheck, build pass. Render YAML parses and official blueprint docs verify plan 0.5c-512mb, Singapore and autoDeployTrigger off. Existing bundle-size warning remains (~978kB), no build failure. Git diff whitespace check clean.

Evidence: https://socialchoice.vercel.app/api/health currently returns frontend HTML and app backend-unavailable message (previous browser probe). Prepared backend is not deployed. Public listener requires admin hash, HTTPS app config and absolute persistent database path; sessions/entity routes remain protected across allowed proxy host. No fake response, destination URL or deployment status.

Cost: official Render pricing DOM on 2026-10-12 shows compute USD7/mo +1GB disk USD0.25/mo; Hobby workspace USD0/mo plus compute and applicable usage/tax. Screenshot render-pricing-261012-1801.png. No account/resource/spending action performed.

Repository now includes pnpm-lock.yaml/pnpm-workspace.yaml; actual installed pnpm11.25.0 used. Fixed earlier docs claiming no pnpm manifest. Deployment uses frozen pnpm lock rather than mixed installation.

No user database or secrets copied, no process stopped, no production config pushed or provider resources provisioned. Read-only pricing tab closed; user Meta tab retained.

Independent review: no runtime/security blocker. Fixed docs/comments that previously described all modes as loopback-only; loopback remains local default and hosted public binding is explicit/authenticated.

Unresolved: spending approval for concrete Render route; provider account access; private environment setup; reviewed source deploy; verified backend URL; Vercel API cutover; action-time Meta callback save and real OAuth test. Local data migration awaits explicit private-transfer route and backup.
