# Socialchoice

Standalone local content planning workspace. React/Vite frontend plus an owned Node/SQLite backend. The existing page layout, neutral palette, Mona Sans/Space Grotesk typography, Phosphor icons and skewed green buttons are retained. The supplied source had missing components and a broken entry file; Phase A restores them without replacing the existing page designs.

## Run locally

Prerequisite: Node.js 24 or newer, npm. No Base44 account, Deno, cloud credentials or paid connector required.

```powershell
cd D:\Socialchoice
npm ci
```

Start two terminals in the project folder:

```powershell
npm run dev:api
```

```powershell
npm run dev
```

Open http://127.0.0.1:5173. The API binds to 127.0.0.1:3001. Vite proxies /api to it and fails if its configured port is occupied. Stop both terminals with Ctrl+C when finished; don't start duplicate servers on other ports.

Create a brand under Settings, then its pillars and angles. Add destination references under Social Accounts to plan for multiple Pages. References remain Configuration required; they are not OAuth connections. Save drafts from Create Post; edit/duplicate from All Posts. Calendar plans appear in month/week/list views and can be rescheduled.

Optional server configuration is listed in .env.example. For overrides, copy it to .env.local and set matching API/frontend ports in both terminals. The API script reads .env.local; Vite loads it for its config. No secret values belong in VITE_* variables or Git. The default timezone is Asia/Ho_Chi_Minh and scheduled timestamps are stored in UTC.

## Data and backup

Persistent data: data/socialchoice.sqlite. Refreshing or restarting the server preserves it. Data and .env files are ignored by Git. With the API stopped cleanly, copy the data folder to a safe backup location. Restore that folder only while the API is stopped. Do not remove it to fix frontend problems. Tests use separate temporary/in-memory databases.

The original source snapshot is plans/261012-0943-phase-a/source-before-phase-a.zip. The original base44/ configuration and schemas remain for reference, but the standalone runtime does not read them or contact Base44. Its owned schemas are in server/entity-schemas.json. No existing hosted Base44 records have been exported, changed or migrated automatically.

## Implemented in Phase A

- Persistent Brands, Pillars, Angles, drafts/posts and calendar plans.
- Brand/pillar/angle and demo/live relationship validation on the server.
- Draft creation/editing/duplication/deletion and multiple destination selection.
- Atomic plan save with destination rows; rescheduling in UTC and Vietnam display time.
- Calendar month/week/list, content filters, unique content mix vs pillar targets, optional destination-plan counts.
- Archive used strategy records instead of deleting history; reject unsafe parent moves/deletes.
- Explicit unconfigured integrations; server rejects manually forged live connected/published states.
- Real data by default. Optional sample workspace is isolated and visibly labeled simulation.

## Not implemented yet

Facebook OAuth, Page discovery, real publishing, platform metrics, server delivery worker/retries, media upload storage, cloud deployment and production authentication. Publish now is disabled. Scheduled means a saved calendar plan; it does not promise future delivery. Sample published records are simulation only.

This is a loopback-only personal workspace, not a public authenticated service. Before public deployment, add real admin sessions/owner authorization, HTTPS and a hosted persistence/backup strategy. Do not bind the API to a public interface or expose it through a tunnel. Production planning is documented in the migration report.

Phase B needs owner-provided Meta App configuration in server environment variables and an authorized test Page. Never provide a Facebook password to this app or paste secrets into chat. OAuth must happen on Meta's official domain. No claim of approval, connection or successful publishing will be made without a real API test.

## Validation

```powershell
npm test
npm run lint
npm run typecheck
npm run build
```

npm run preview is a frontend build preview only; it does not configure the API proxy. Use the development pair above for functional Phase A checks. Build output is dist/. Publishing/deploying is a separate future task; no automatic Git/Base44 sync is used.

Audit: plans/reports/project-audit-261012-0943-socialchoice-report.md
Plan: plans/261012-0943-phase-a/plan.md
Validation: plans/reports/phase-a-validation-261012-0943-socialchoice-report.md
Product/design contract: SOCIALCHOICE_PROJECT_GUIDE.md
