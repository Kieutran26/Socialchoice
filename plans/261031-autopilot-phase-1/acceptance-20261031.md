# Phase 1 follow-up acceptance

Date: 2026-10-31 (Asia/Ho_Chi_Minh)

## Outcome

The isolated staging backend passes 11 real API acceptance checks.
The UI fixture passes browser interaction checks on desktop and a mobile frame.
Real Drive OAuth and real AI vision remain blocked by missing configuration.
GitHub branch creation now passes after the owner installed the connector for the target account.
Phase 1 is not accepted for production.

## Staging resources

| Resource | Value |
|---|---|
| Worker | `socialchoice-autopilot-staging` |
| Application | `https://socialchoice-autopilot-staging.nguyenngockieutran.workers.dev` |
| Public UI fixture | `https://socialchoice-autopilot-staging.nguyenngockieutran.workers.dev/__preview/` |
| Private R2 bucket | `socialchoice-autopilot-staging` |
| Queue | `socialchoice-autopilot-staging` |
| Queue ID | `751b7ed53be6468c9224092947b71d5f` |
| Dead-letter Queue | `socialchoice-autopilot-staging-dlq` |
| Consumer | Batch 1, concurrency 1, eight retries, separate dead-letter Queue |
| Final Worker SHA-256 | `3f3784c25bb3cf18b1f2555becbc386ff8b1e52de610808c34d1b2c8c869ed55` |

The staging Worker uses a new password hash, vault key, and Durable Object namespaces.
No production credentials or user data were copied. Test fixtures contain no personal data.
The normal application requires authentication. The public UI fixture contains simulated data only.
The public fixture does not expose an authentication bypass or call live integrations.

The build command creates an artifact. It never uploads or deploys automatically.
The Cloudflare connector uploaded the reviewed artifact to the separate staging Worker.
Temporary R2 build chunks were removed after upload. The staging fixtures remain available for repeat acceptance.

## Real backend acceptance

Evidence: [staging-api-evidence.json](staging-api-evidence.json).

| Check | Result |
|---|---|
| Anonymous catalog request | PASS, 401 |
| Feature, R2, and Queue readiness | PASS |
| Queue producer dispatch | PASS |
| Background Queue/RPC/R2 metadata ingestion | PASS |
| Workspace prefix isolation | PASS, outside-prefix object excluded |
| Repeat sync without duplicate assets | PASS |
| Generic entity forgery | PASS, 404 |
| Cross-origin request | PASS, 403 |
| AI request without confirmation | PASS, 409 |
| AI request without provider configuration | PASS, 409 |
| Drive connection without OAuth configuration | PASS, 409 |
| Ingestion creates no post | PASS |

The JSON groups background ingestion and prefix isolation into one check. The total is 11 checks.
The real R2 fixture is a valid 68-byte PNG. The Queue consumer completes both scans without manual processing.
Missing-provider checks prove that the service fails closed. They do not prove successful Drive or AI integration.

## Browser acceptance

Evidence: [staging-ui-evidence.json](staging-ui-evidence.json).

The browser loaded the actual `AutopilotLibrary` component in a separate fixture bundle.
The fixture replaces provider calls with explicitly labeled simulated data.
This separates UI acceptance from the real backend acceptance above.

| Check | Result |
|---|---|
| Panel and source controls render | PASS |
| Approval changes the visible review state | PASS |
| AI request opens the confirmation dialog | PASS |
| Escape closes the dialog | PASS |
| Search with no match | PASS |
| Vietnamese source/job/review labels | PASS after correction |
| R2 form labels and source addition | PASS in mobile fixture |
| Unsupported video analysis | PASS, disabled |
| Desktop horizontal overflow | PASS, page width equals viewport width (1348px) |
| Mobile horizontal overflow | PASS, page width equals client width (373px in a 390px frame) |
| Screenshot proof | BLOCKED, browser capture timed out twice |
| Authenticated complete dashboard UI | Not exercised through the browser |

The mobile result uses a real iframe viewport. It does not simulate mobile hardware, touch input, or browser chrome.
These checks do not claim pixel-perfect rendering or a full accessibility audit.

## Corrections from acceptance

- Added missing Vietnamese source, job, review, pagination, and action labels.
- Distinguished an empty search result from a catalog that has no ingested assets.
- Added repeatable staging build and API acceptance commands.
- Added a public, labeled UI fixture for review without production credentials.

## Regression and production safety

Build, lint, and typecheck pass after the UI corrections. The server suite passes 232/232 tests.
No dependency or lockfile changed. The production Wrangler configuration is unchanged.
Local `main` remains at `1a39393fb1406a6f6b7db739395d63460c0bd1e8`.
No merge, production deployment, or social publication occurred.

Cloudflare reports the production `socialchoice-api` modification time as `2026-10-30T08:09:55.411425Z`.
That value matches the value recorded before staging provisioning.
The final staging upload time is `2026-10-31T10:17:40.000555Z`.

## Remaining external gates

### GitHub — permission gate resolved

The owner installed the missing connector. A new create-ref request succeeded for `feature/autopilot-phase-1`.
Code handoff uses that branch. The earlier permission evidence follows for diagnosis.

The connector identifies the authenticated user as `Kieutran26`.
Before the installation, a repeated create-ref request returned `403 Resource not accessible by integration`.
Before the installation, the accessible GitHub App installation list did not contain the target account.
Repository metadata that reports admin/push rights does not prove installation write access.

The branch now exists on GitHub. No merge or production deployment is part of this handoff.

### Google Drive

Staging has no `GOOGLE_DRIVE_CLIENT_ID` or `GOOGLE_DRIVE_CLIENT_SECRET`.
The owner must configure a Google OAuth client with this exact callback:

`https://socialchoice-autopilot-staging.nguyenngockieutran.workers.dev/api/drive/callback`

Real consent requires account interaction. Listing, refresh, disconnection, and revoked-access acceptance remain open.
The Google consent screen can require test users or verification for the requested read scope.

### AI

Staging has no configured provider key/model. No paid provider request occurred.
A vision-capable model, valid provider key, and confirmed test image are necessary for real AI acceptance.
The existing unit tests still cover schema validation, cache invalidation, leases, and review requirements with fixtures.

Credentials belong in private staging configuration or the protected application form. They do not belong in chat or Git.

## Repeatable commands

From the repository root:

```bash
npm run build
npm run lint
npm run typecheck
npm test
node scripts/build-autopilot-ui-fixture.mjs
node scripts/build-autopilot-staging.mjs
node --use-env-proxy scripts/accept-autopilot-staging.mjs
```

The API command uses the locally generated staging secret file under ignored `.test-tools/`.
It writes only synthetic acceptance data into the named staging application.
A clean checkout must first receive matching staging credentials through a private configuration channel.
