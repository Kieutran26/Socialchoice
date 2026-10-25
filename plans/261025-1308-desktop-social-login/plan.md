# Desktop social login

Status: IMPLEMENTED AND VERIFIED LOCALLY. Real OAuth awaits owner service deployment/provider configuration; no live grant claimed.

Outcome: native browser OAuth through the approved stateless broker; encrypted local credentials; explicit verified destination selection; check/reconnect/disconnect on existing Social Accounts UI. Preserve UI, license enforcement, local data, no developer content storage. No live publishing, paid calls, production deployment or automatic cloud migration in this task.

Implementation:
1. Extend broker authorization exchange with bounded verified identity/permissions/destinations. Never ship App Secrets or relay tokens into renderer.
2. Native loopback/state/PKCE, fixed trusted broker origin, bounded requests, cancel/timeout, current-user DPAPI vault and native account persistence.
3. Route existing connection APIs through native commands; retain external browser, explicit account import and error/setup states. Enable Social Accounts desktop route.
4. Focused broker/native/bridge regression tests, type/lint/build, independent review and UI smoke when available.

Acceptance: malformed callback/state/replay/redirect and forged account writes rejected; secrets excluded from renderer/entity reads/backups; license checked before connection mutation; no SQLite lock during browser/network; disconnect blocks future credential use; new/reopened app retains imported accounts; no Connected state without verified provider identity and scopes. Offline reads work. Missing broker/provider setup clearly reported.

External requirements: production broker origin and provider App credentials/registered redirects/permissions. No secret values in chat. Customer-owned public media configuration remains subsequent publishing work.

Validation: native36/36; broker14/14 plus bridge4/4; web/desktop typechecks, lint, web build, smoke and normal desktop builds/NSIS passed. Packaged setup-state smoke at1440/390 passed with isolated application identifier and temporary records cleaned. Independent review DONE after repairs. See [delivery record](../reports/desktop-login-261025-1308-social-connections-report.md).
