# Owner web license interface

Status: implemented, reviewed and deployed. Completion verified2026-10-26. Production authenticated owner issuance remains an acceptance gap because the browser session expired. Owner explicitly accepted moving the existing signing key into the Socialchoice backend secret store for direct web issuance. Public identity and encrypted local original preserved; no key rotation. See [delivery report](../reports/feature-261026-1223-admin-license-ui-report.md).

Outcome: owner-only license management page, validated email/name/edition and explicit purchase confirmation, downloadable SCW1 file, encrypted issuance history and idempotent retry. Customers/local unrestricted runtime cannot call issuance routes. Existing design and editions preserved; no revocation, payment integration, sales limits or account management added.

Steps: inspect auth/design, extract shared signing logic without changing CLI contract, implement owner service and HTTP boundary, add UI/translation/sidebar link, test actual Workers owner/customer authorization and persistence, verify interface at1440/390, review, upload only existing private signing key to existing Worker secret via private stdin, deploy matching backend/frontend, verify anonymous/customer denial and owner-page delivery. Do not fabricate a production purchase or issue a real license for an unspecified customer.

Acceptance: existing SCW1 public key verifies issued files, customer calls denied server-side, no private key in responses/frontend/history, replay cannot mint duplicates, failed/mismatched key setup fails closed, original workspace data and bindings preserved. Report any unverified production issuance separately.
