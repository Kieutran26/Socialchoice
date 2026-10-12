# Free backend validation — 2026-10-12

Cloudflare dashboard verified account Workers Free, $0, Current plan. No upgrade made. Existing unrelated Workers unchanged.

Implemented shared portable SQLite store and HTTP handler; Cloudflare SQLite Durable Object adapter; encrypted persistent sessions, throttle and OAuth selections; authenticated fail-closed API. Local Node SQLite/UI preserved. Actual workerd runtime exposed two compatibility issues: forwarded Host authority and string cipher input encoding; both fixed and verified.

Validation: 29/29 tests pass, lint/typecheck/build pass; existing ~978KB frontend bundle warning. Worker runtime test builds actual source, verifies anonymous denial, secure admin cookie, Vietnamese brand persistence, sessions across restart, logout and persisted attempt lockout. No fake Meta success responses used. Independent review found no Critical/High code defects.

Operational status: Worker not deployed, Vercel rewrite unchanged, no local data/credentials transferred. Meta OAuth/publishing remains unverified. Paid Render proposal superseded; manifest removed.

Required permission: automatic approval rejected scoped Wrangler login because account-wide Workers write + offline access creates durable broader access than prior deployment authorization. Stopped login attempt and asked explicit owner approval. No workaround used. If approved, authenticate Wrangler, deploy only socialchoice-api, provision secrets via setup:cloudflare stdin, verify health/auth, configure Vercel proxy, then complete HTTPS Meta callback approval and real OAuth.

Unresolved: owner OAuth scope approval; live deployment/private config; Vercel cutover; actual Meta authorization/Page import.

Live update: owner approved scoped Wrangler access and private admin/Meta configuration transfer. Device login completed; only socialchoice-api deployed on Free. Initial Worker version 5686328c-fb58-4e17-8332-2027bc135b2b; two private admin/storage secrets provisioned through stdin. https://socialchoice-api.nguyenngockieutran.workers.dev/api/health returns 200 JSON admin-session; anonymous /api/session returns401. No Meta secret file configured, no Meta secrets transferred. Local content unchanged. Vercel API rewrite prepared after live verification; deployment pending verification.
