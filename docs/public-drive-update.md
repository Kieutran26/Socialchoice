# Public Drive link update

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

## Open gates

GOOGLE_DRIVE_PUBLIC_API_KEY is not yet provisioned for staging. No production API key was copied. A public test folder with a synthetic binary file is needed to verify real listing, repeat sync and image retrieval. Existing OAuth test folder was created private; sharing has not been changed automatically. Real AI remains unconfigured and unaccepted.
Post-deployment browser verification was blocked by the browser runtime failing to initialize. No visual acceptance or screenshot proof is claimed for this change. The previously deployed simulated __preview fixture was not rebuilt and is not acceptance evidence for the public-link flow.
