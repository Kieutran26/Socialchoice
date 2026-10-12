# Admin server validation

Implemented: optional real single-admin sessions; localized sign-in/sign-out; password setup via hidden Windows prompt; built UI and API served from one loopback Node process; HTTPS-origin configuration fails without auth. Existing SQLite content retained.

Files: server/admin-auth.js, setup-admin.js/.ps1, start.js, static-site.js, index.js; src/lib/AuthContext.jsx, components/admin-sign-in.jsx, Layout.jsx, api/app-client.js; language catalogs; package scripts; README and docs/admin-server-setup.md.

Calendar source at start contained a stray `ContentPillars.jsx` suffix, missing grouping type and unlocalized strings. Removed invalid suffix, declared grouping type and restored label/date localization without changing layout.

Validation: 19 real unit/integration tests pass; lint, typecheck, build pass. Built bundle still warns about size (~971 kB); no build failure. Localization scanner: 534 keys, zero missing static keys; raw product/language names intentional. PowerShell setup parses successfully. Setup test uses separate temporary directory, confirms Unicode password verifies and existing credentials cannot be replaced. Session expiry and restart invalidation verified.

Independent reviewer: no critical/high blocker for local standalone scope. Global login throttling can lock the single admin after remote abuse, and Windows credential-file ACLs require restriction before public deployment; recorded in owning setup docs. No internet exposure performed.

Browser verification before interruption: built-site login in Vietnamese, authenticated overview, refresh retains session, logout returns sign-in. Temporary in-memory database and test-only password; no user content touched. Evidence: admin-sign-in-261012-1609.jpg. Test listener PID 56668/port3001 ended on interruption; port3001/5173 not listening on resume. No real .env.admin created.

Security boundary: single process, server-memory opaque sessions, eight-hour absolute expiry, restart revokes all sessions, server-owned one-admin identity. Session is required for all entity operations when password is configured. Local-only no-password mode remains for development. Public mode requires HTTPS proxy and persistence/operations setup; not deployed.

Unresolved: owner has no hosting/domain. Cloud deployment, supervised 24/7 operation, automated backups and Meta credentials/OAuth/publishing remain pending. Password must be chosen by owner locally with npm run setup:admin; never in chat and never Facebook password.
