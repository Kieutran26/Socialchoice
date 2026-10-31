# P1-00 Baseline & Safety Gate

Date: 2026-10-31 (Asia/Ho_Chi_Minh)

- Repository cloned from https://github.com/Kieutran26/Socialchoice.git.
- Baseline: `1a39393fb1406a6f6b7db739395d63460c0bd1e8` (`main`). Initial working tree clean.
- Runtime: Node 24.22.1, npm 11.9.0.
- `npm ci --no-audit --no-fund`: FAIL, package-lock out of sync (fonts, concurrently, Wrangler and others). No lockfile rewritten.
- Documented installer `corepack pnpm install --frozen-lockfile`: PASS, pnpm 12.16.1, 626 packages; no dependency changes.
- `npm run build`: PASS; existing large-chunk warning (JS ~1.49 MB).
- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 214/214 after dependencies installed. Before installation 212/214 (two runtime tests require Wrangler).
- GitHub repository metadata reports admin/push rights, but create-ref API returns 403 `Resource not accessible by integration`. Remote branch creation BLOCKED; not a successful write authorization check.
- Local branch `feature/autopilot-phase-1` created from the exact baseline. `main` stays at the baseline.

## Safety decisions

Development may proceed locally on the feature branch. Remote handoff remains blocked by integration permissions. No push to main, merge, deployment, cloud provisioning, production database access, real OAuth grant, publication or real AI request is part of this run. All new endpoints are disabled unless SOCIALCHOICE_AUTOPILOT_ENABLED=true. Tests use isolated databases and mocked providers. Existing scheduler/publisher and original media bytes remain unchanged. New source files remain in Drive/R2; only metadata, job state, encrypted grants and analysis enter workspace SQLite. Do not add Supabase/RLS to this runtime: workspace isolation is enforced by existing authenticated Durable Object routing and brand validation.
