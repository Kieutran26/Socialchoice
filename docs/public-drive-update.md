# Public Drive link update

Latest follow-up: [2026-11-01 image membership recovery and diagnostics](../plans/261031-autopilot-phase-1/acceptance-20261101.md). The remaining-gates section below is the historical 2026-10-31 snapshot; the linked report owns the current acceptance status.

Date: 2026-10-31 (Asia/Ho_Chi_Minh)

New sources accept an HTTPS public Google Drive folder link. No end-user OAuth is required for these sources. The server requires GOOGLE_DRIVE_PUBLIC_API_KEY with the Drive API enabled; API keys are sent only in Google API request headers. Existing OAuth sources remain separate and are not silently migrated or revoked.

The parser allows only drive.google.com folder URLs, including /drive/u/<number>/folders/<id> and resourcekey. It rejects credentials, non-HTTPS URLs, other hosts, non-folder paths and malformed keys. All network requests use fixed Google API endpoints, no redirects, deadlines and bounded bodies. Each public scan checks folder readability. Image downloads recheck parent membership and file version. Catalog deduplication remains per source and external ID; metadata remains per workspace. Public visibility does not share the Socialchoice catalog across workspaces.

## Validation

- Vite build: PASS (existing large-chunk warning).
- Full ESLint: PASS.
- TypeScript check: PASS.
- Full server suite: 234/234 PASS on Windows/Node 24.17.0, including existing Worker/R2/Queue/customer isolation tests.
- Autopilot suite: 19/19 PASS, including 2 new public Drive tests covering URL validation, resource keys, no Authorization header, fixed endpoints, dedupe, revoked access preservation, membership and redirect rejection.
- Corrected persistence test cleanup order: close SQLite before removing its temporary directory on Windows.

## Deployment

Only socialchoice-autopilot-staging was deployed. Final Worker version: 39416453-af6e-4084-98fe-86b0b3da6b8c.
Staging origins, R2/Queue names and existing secrets were preserved. Preview URLs remain disabled. No main changes, merge, production deployment or social publication.
Code checkpoint before this report: f2335b4e2b7bd6b18d2b26ddd0457f182b000383 on feature/autopilot-phase-1.

## Real staging acceptance — completed 2026-10-31

A new Google Cloud key named Socialchoice Staging Public Drive was created in project gen-lang-client-0162277458, restricted to Google Drive API only. The key was transferred directly into GOOGLE_DRIVE_PUBLIC_API_KEY as a Cloudflare Secret; its value is not recorded here or in repository files. No production key was used.

The owner explicitly approved Anyone with the link / Viewer for the synthetic test folder Socialchoice Autopilot Staging Test (folder ID 1WlHerS9ejeDgnxVq8tqTU2sdUJshgRu7). One 68-byte synthetic PNG named drive-public-test.png was uploaded. No existing personal files were imported.

Observed through the real authenticated staging UI:
- Public source creation from the folder URL succeeds without Google OAuth.
- Public access check changes Public Drive Acceptance to Connected.
- First Queue sync completes automatically, cataloging drive-public-test.png as image/png, 68 B, Available.
- Second Queue sync completes automatically; catalog still contains exactly one imported asset.
- Switching to Autopilot Acceptance shows only its existing R2 fixture kiem-tra-anh.png and prior sources, not the public source or drive-public-test.png.
- This is live brand filtering evidence, not a new live cross-customer acceptance test. Existing customer/Worker isolation regression tests pass.

The initial live request exposed a Workers compatibility bug: redirect: error is unsupported by Cloudflare fetch. Drive provider calls now use redirect: manual; all non-2xx responses, including redirects, are rejected. Both public and legacy OAuth requests receive this fix. No legacy OAuth success is claimed.

Temporary staging-only diagnostic changes were removed. Worker logs/traces remain disabled, temporary tail stopped, R2/Queue bindings restored and verified in deployment output, Preview URLs disabled.
Final Worker version: ea47d66a-4c2b-49ea-a204-602b6ab86623.
Fix checkpoint: 912dfd088d12625c6fbc6f2d22e845e59fe286c7.
Full server tests 234/234, lint, typecheck and staging bundle build pass after the fix.

## Remaining gates

Real AI is not configured or accepted. No image was sent to an AI provider and no provider charge was triggered.
Actual image-byte retrieval from public Drive, public-access revocation, resourcekey-protected real folders, pagination beyond the single-file fixture, and live cross-customer isolation remain unverified. Relevant unit/regression coverage is not a substitute for those live gates.
Production remains unchanged. No main edit, merge, production deployment or social publication occurred.
