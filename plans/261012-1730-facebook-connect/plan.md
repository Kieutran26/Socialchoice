# Facebook Page connection

Status: connection code implemented and locally verified; live Meta acceptance pending owner app configuration. Independent review fixes applied.

Outcome: real Meta OAuth, discovered Page selection, encrypted server-only credentials, disconnect and token health; retain UI and Vietnamese.

Scope: connect Pages only. Publishing, worker, media and hosting excluded from this request. No invented Pages, credentials or API success. Real end-to-end verification requires owner Meta App and permitted Page.

Steps: inspect current contracts; verify official Meta API guidance; add config/Graph client and private vault; session-bound state/callback/Page import; UI controls and language; validate security/persistence/unconfigured behavior; independent review; document owner setup.

Acceptance: no-password local mode cannot start OAuth; no secrets via entity API/browser; callback rejects invalid/replayed/expired state; only API-discovered selected Pages become connected; manual records cannot forge connection; disconnect clears credentials; health detects revoked/expired tokens; existing tests/build pass.

Rollback: restore changed source, retain database and environment; private tables additive. Do not delete content or tokens blindly.

External prerequisites: App ID, App Secret, API version, redirect URL, encryption key provided locally by owner. Meta approval/access remains unverified until a real test.
