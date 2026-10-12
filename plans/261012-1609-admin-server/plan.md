# Admin server preparation

Status: implementation, validation and independent review complete. Hosting unavailable (owner confirmed).

Outcome: standalone built-site server and real single-admin sign-in; preserve UI, content and language selection.

Constraints: no deployment/secrets in chat, no Facebook password, no simulated integrations. Keep existing SQLite and React stack.

Steps: inspect existing routes and setup; add session enforcement and password setup; add localized sign-in/sign-out; serve built UI; verify auth and existing planning tests; independent review; document hosting handoff.

Acceptance: unauthorized entity access denied; correct login grants session; old session rotates/revokes; invalid origins blocked; production configuration fails closed; lint/type/build and persistent planning checks pass.

Hosting and Meta credentials are external prerequisites for later deployment/integration, not needed for this preparation. Rollback: remove new server/auth setup and restore touched source from Git; preserve data and environment files.
