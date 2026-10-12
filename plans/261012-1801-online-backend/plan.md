# Free Cloudflare backend

Outcome: persistent authenticated online API for existing Vercel UI and working HTTPS Meta callback route. Preserve UI and local data; Free plan only; no fake integration status.

Completed: shared portable backend, SQLite actor, encrypted persistent sessions/OAuth state, 29 passing tests, lint/typecheck/build, independent review, owner-authorized Wrangler device login and private admin/storage setup, Cloudflare Free deployment, Vercel Git deployment and API cutover, Meta HTTPS callback saved/reloaded/validated with owner approval.

Evidence: backend and public app /api/health return200 JSON admin-session; public anonymous /api/session401; Vietnamese sign-in screen. Worker actual runtime verifies persistent content/sessions/throttle across restart. Local data preserved; cloud starts empty. Vercel commit adaf9aa, deployment9edRC65B3Z64nvF2iYgRsyPE39oU. See ../reports/free-backend-validation-261012-1841-socialchoice-report.md.

Remaining: owner private Meta App Secret/version/encryption-key setup; real Meta OAuth and authorized Page import. Owner password sign-in not performed by agent. Publishing out of this deployment scope and unavailable.

Route/config/rollback: ../../docs/online-deployment.md; ../../wrangler.jsonc; ../../docs/facebook-connection-setup.md. Paid Render proposal rejected and superseded. No paid upgrade performed.
