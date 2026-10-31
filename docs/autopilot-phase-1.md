# Socialchoice Autopilot Phase 1

## Public Drive link sources — 2026-10-31 update

New Drive sources use a public folder link instead of Google OAuth. Choose Public Google Drive folder, paste an HTTPS drive.google.com/drive/folders/... link (including resourcekey when present), add the source, check public access, then queue sync.
The owner must set the folder to Anyone with the link / Viewer in Google Drive. Socialchoice never changes sharing automatically.
The server requires GOOGLE_DRIVE_PUBLIC_API_KEY with Google Drive API enabled and API restrictions limited to Drive. This key stays server-only, never in VITE variables or the browser. OAuth client ID/secret and Test users are not required for public sources.
Only direct binary children are cataloged. Nested folders, shortcuts and Google Docs export are excluded. Private or revoked folders fail without replacing prior catalog availability.
Requests use fixed Google API endpoints, bounded reads, deadlines, no redirects and validated folder IDs. Resource keys are preserved. AI downloads recheck parent membership and file version.
Existing OAuth sources and encrypted grants remain separate legacy records; this change does not silently convert them or revoke grants at Google.
Verification status: see public-drive-update.md. No production rollout is authorized.

## Status

This branch adds Drive/R2 metadata ingestion, an asset catalog, and image analysis. The feature is off by default.
The existing media uploader, composer, scheduler, and publishing approvals retain their behavior.
The production Wrangler configuration has no new bindings or variables.

The branch is not a production release. Real Google authorization and real AI responses still need acceptance tests.
The staging browser fixture passes desktop/mobile interaction checks. Screenshot capture remains blocked by browser timeouts.
See [follow-up acceptance evidence](../plans/261031-autopilot-phase-1/acceptance-20261031.md).

## Architecture

| Component | Implementation |
|---|---|
| Source of original files | A selected Drive folder or a prefix in a private R2 bucket |
| Workspace isolation | Existing authenticated owner/customer Durable Objects |
| Catalog and jobs | Private SQLite tables in each workspace |
| Credentials | AES-256-GCM vault, with source ID and connection generation in the credential key |
| Queue | Optional Cloudflare Queue with private Durable Object RPC |
| AI | Existing encrypted OpenAI/Gemini configuration and Gemini regional relay |
| UI | An Autopilot panel inside Media Library, for web users and live brands |

There is no Supabase dependency. RLS does not apply to this SQLite runtime.
The authenticated gateway selects the workspace. The service validates each source against its live brand.
Generic entity APIs cannot write sources, assets, jobs, credentials, or analysis results.

Drive/R2 retains the original bytes. SQLite retains metadata, private credentials, job state, and analysis.
The ingestion code does not create `MediaAsset` rows or post drafts. Imported assets cannot enter the composer yet.

## Configuration

| Name | Purpose |
|---|---|
| `SOCIALCHOICE_AUTOPILOT_ENABLED=true` | Enables the endpoints and panel |
| `SOCIALCHOICE_STORAGE_KEY` | Existing 32-byte hexadecimal vault key in Workers |
| `SOCIALCHOICE_AI_ENCRYPTION_KEY` | Vault key for the local Node runtime |
| `GOOGLE_DRIVE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Private Google OAuth client secret |
| `SOCIALCHOICE_PUBLIC_ORIGIN` | Existing exact application origin |
| `AUTOPILOT_ASSETS` | Optional R2 bucket binding |
| `AUTOPILOT_QUEUE` | Optional Queue producer binding |

Drive OAuth requires a signed-in admin/customer session. Local mode without a password cannot connect Drive.
The callback URI is `${SOCIALCHOICE_PUBLIC_ORIGIN}/api/drive/callback`.
Local development defaults to `http://127.0.0.1:5173/api/drive/callback`.

The requested scope is `https://www.googleapis.com/auth/drive.readonly`.
Google grants this scope for the account. Application code restricts catalog access to the selected folder.
Google consent and verification requirements still apply. This implementation does not claim folder-scoped Google authorization.

OAuth uses state, PKCE, an expiring callback cookie, an active session, and a single-use ticket.
The vault encrypts PKCE verifiers and offline grants. Disconnect removes the local grant.
Disconnect does not revoke the application grant at Google. The user can revoke access in their Google account.

### Local development

1. Install dependencies with `corepack pnpm install --frozen-lockfile`.
2. Configure the local vault key and admin password in ignored environment files.
3. Add the feature flag and Google credentials to `.env.local`.
4. Start the API with `npm run dev:api`.
5. Start the frontend with `npm run dev:client`.
6. Sign in through the local application.
7. Open Media Library and select a live brand.
8. Add a source with its Drive folder ID.
9. Select Connect and complete Google consent.
10. Select Queue sync.
11. Without a Queue binding, select Process next job until the queue finishes.

Node has no R2 binding by default. The isolated Worker test exercises R2 and Queue locally.
The source API does not accept arbitrary URLs, cloud credentials, or bucket names from the browser.

### Isolated staging configuration

An isolated staging Worker, R2 bucket, Queue, and dead-letter Queue now exist.
The production Worker and configuration remain unchanged. See the follow-up acceptance evidence for resource names.

1. Copy the Wrangler configuration to a separate staging file.
2. Give the staging Worker a new name and separate origins.
3. Retain the Durable Object class definitions in the staging file.
4. Use new staging secrets, a separate R2 bucket, and separate Queues.
5. Add the feature flag to the staging variables.
6. Bind the R2 bucket as `AUTOPILOT_ASSETS`.
7. Bind the Queue producer as `AUTOPILOT_QUEUE`.
8. Add the same Queue as a consumer with batch size `1`.
9. Configure a dead-letter Queue and bounded delivery retries.
10. Register the staging callback URI in the Google OAuth client.

Example additions to the separate staging configuration:

```jsonc
{
  "r2_buckets": [{ "binding": "AUTOPILOT_ASSETS", "bucket_name": "socialchoice-autopilot-staging" }],
  "queues": {
    "producers": [{ "binding": "AUTOPILOT_QUEUE", "queue": "socialchoice-autopilot-staging" }],
    "consumers": [{ "queue": "socialchoice-autopilot-staging", "max_batch_size": 1,
      "max_batch_timeout": 1, "max_retries": 8, "dead_letter_queue": "socialchoice-autopilot-staging-dlq" }]
  }
}
```

The owner storage root is `owner/`. Each customer root is `customers/<customer-id>/`.
A source prefix such as `campaigns/` stays within that workspace root.
The consumer sends only a workspace ID to private RPC. It never receives grants, filenames, prompts, or image bytes.
No public HTTP route exposes the RPC method. Existing publishing alarms do not process Autopilot jobs.

## Operation and recovery

A sync scans direct binary children of a Drive folder. It does not scan nested folders or export Google Docs.
R2 scans all objects under the selected prefix. Each job processes at most 100 items.
A scan stops after 100 pages. Each workspace supports 30 sources, 10,000 assets, and 200 pending jobs.

The catalog deduplicates by source ID and external file ID. Each page commits its assets and cursor together.
A complete scan marks absent files as missing. A failed partial scan preserves previous availability.
No job deletes original files. A disconnected source retains its catalog but blocks new analysis.

Queue messages can arrive more than once. Durable job claims and leases prevent concurrent completion.
A scan can retry transient provider errors three times with delay. Manual retry starts a new retry budget.
A source generation change invalidates old jobs and OAuth callbacks. A file version change clears analysis and review.

Image analysis supports valid PNG, JPEG, and still WebP, up to 3 MiB and 40 megapixels.
Video and other file types retain metadata only. They do not receive invented AI results.
The provider receives image bytes only after explicit confirmation. Provider charges can apply.

Analysis stores summary, tags, visible text, suggested uses, warnings, provider, model, timestamp, and schema version.
The cache includes file version, connection generation, schema version, provider, and model.
The service validates the JSON response and requires human review. Approval does not save or publish a post.

An uncertain or interrupted AI job never retries automatically. Manual AI retry requires another confirmation.
A failed Queue dispatch retains the durable job and reports that manual recovery is available.
A dead-letter Queue requires operator attention. There is no automatic sweep of all workspaces after a lost dispatch.

1. To recover a saved job, open its brand in Media Library.
2. Select Process next job, or retry a failed job.
3. If a scan cursor is stale, start a new sync.
4. If Google access expires or changes, reconnect the source.
5. If an AI job fails, inspect the provider configuration before retry confirmation.

The panel shows the latest 100 jobs and pages assets in groups of 100.
It searches filenames, summaries, and tags without regular expressions.
Metadata does not include public preview links. Source previews and composer reuse remain follow-up work.

## Acceptance and remaining gates

| Gate | Evidence or remaining work |
|---|---|
| Baseline | `plans/261031-autopilot-phase-1/baseline.md` |
| Source validation | Unit tests reject demo brands, bad folder IDs, and unsafe prefixes |
| Isolation | Worker tests reject cross-customer source IDs, brand IDs, and OAuth callbacks |
| Ingestion | Unit tests cover pagination, duplicates, partial scans, changes, and missing files |
| Persistence | SQLite restart test retains sources and jobs |
| Background processing | Local runtime and real staging Queue/R2/RPC acceptance import metadata |
| AI safety | Mock tests cover consent, schema, cache, stale results, leases, and retry consent |
| Regression | Full server tests include existing publishing and licensing flows |
| Real Drive | Pending staging credentials, consent, real folder access, and token refresh |
| Real AI | Pending a selected vision model, provider quota, and one approved real image request |
| UI review | Desktop/mobile fixture interactions pass. Screenshot proof and complete authenticated dashboard review remain open |
| Operational release | Staging resources exist and remote branch creation passes. Real provider acceptance, dead-letter recovery, and release review remain open |

No production rollout, merge, or publication is authorized by this document.

## Validation commands

```bash
npm run build
npm run lint
npm run typecheck
npm test
npm run test:auth-broker
npm run test:license
```

`npm ci` fails on the baseline because the npm lockfile is stale. The pnpm lockfile installs without modification.
The Windows-only license test skips on Linux. Native Tauri tests require the documented Windows toolchain.

## References

- [Drive files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list)
- [Drive files.get](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/get)
- [Google web OAuth](https://developers.google.com/identity/protocols/oauth2/web-server)
- [R2 Worker API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- [Queue JavaScript API](https://developers.cloudflare.com/queues/configuration/javascript-apis/)
