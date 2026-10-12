# Free Cloudflare backend

Outcome: persistent authenticated online API for existing Vercel UI, free hosting, working HTTPS callback route. Preserve UI, local data and real integration statuses.

Constraints: Free plan only; no upgrade, no automatic local content transfer; no fake Meta or publishing results. One admin workspace.

Phases: portable shared backend implemented; SQLite actor and encrypted persistent session/OAuth maps implemented; real runtime persistence tests passed. Review, cloud deployment, private secrets, Vercel cutover and Meta authorization pending.

Acceptance: real online health JSON, anonymous API denied, owner login and persistent CRUD, correct same-origin cookies, verified callback route. Local auth/planning regression tests and frontend checks pass.

References: ../../docs/online-deployment.md; ../../wrangler.jsonc. Supersedes paid Render proposal rejected by owner.
