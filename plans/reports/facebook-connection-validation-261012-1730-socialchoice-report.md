# Facebook connection validation

Implemented code: Meta config validation and hidden-secret setup CLI; OAuth start/code callback; long-lived user-token exchange; paginated Page discovery; selection/import into active real brand; AES-256-GCM Page credential vault; real access checks/reconnect/local disconnect. Existing UI/design and Vietnamese retained. Publishing remains unavailable.

Files: server/meta-config.js, meta-graph.js, meta-vault.js, meta-connection.js, setup-meta.js/.ps1; server/index.js/store.js/validation.js/admin-auth.js; app-client.js, MetaConnectionCard.jsx, SocialAccounts.jsx, Settings.jsx, language catalog; package scripts/.env.example; README and docs/facebook-connection-setup.md.

Checks: 25 tests pass; lint/typecheck/build pass. Build bundle warning remains (~978 kB), no failure. Localization coverage has no missing static keys. PowerShell setup syntax parses. Tests use temporary stores/configuration, no simulated successful Graph response or runtime fake Page. No owner credentials were read, printed or used; no real .env.meta created by assistant.

Verified: credential encryption/restart persistence/AAD tamper rejection; entity API isolation; manual metadata forgery prevented; session/nonce-bound state, cancellation/replay and logout denial; private setup generation/non-overwrite; unconfigured HTTP behavior; all prior planning/auth/localization tests.

Review: no critical/high blocker. Fixed reconnect/check race by rotating credential identity and removing old credential transactionally; checked Graph response shapes before accepting metadata/tokens; cross-checked callback/public origin and request origin. Windows env file ACL restriction remains owner responsibility, documented.

Live verification: NOT performed. Meta manual-login/Pages docs returned 429; official Meta Postman Page-token collection verified discovery contract. Code exchange/permission eligibility/positive Page import must be verified against owner app. No Meta approval, connected account or publish success claimed. No browser screenshot of a successful connection fabricated.

Process: user-owned port3001 PID51580 left running. A temporary in-memory UI listener could not bind that occupied port and exited immediately; no alternate duplicate listener created. User must restart current server to load new backend/env scripts. No user data overwritten or runtime test Pages created.

Unresolved: owner must create/configure Meta Developer App and authorized Page, enter App ID/Secret/version/callback via npm run setup:meta locally, restart and complete real OAuth. Hosting/domain/24x7 delivery, platform deauthorization webhook, background token checks, publishing scopes/jobs remain outside connection scope.
