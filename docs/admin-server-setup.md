# Admin server setup

The existing React/Vite application can now run from one Node server using its built `dist/` assets and the same persistent SQLite database. No hosting has been deployed. Facebook remains unconfigured.

## Windows setup

From `D:\Socialchoice`, run `npm run setup:admin`. Enter a new Socialchoice password of 15–256 characters in the hidden prompt. Do not use a Facebook password or paste the password into chat. The command creates `.env.admin` containing only a salted scrypt hash, never overwrites an existing file, and does not print the password/hash. Keep the file private; it is ignored by Git. Restrict Windows file access to the server account (POSIX file modes do not establish Windows ACLs).

Run `npm run build`, then `npm start`. Open `http://127.0.0.1:3001`. One server serves the web app and API. Sign in and use Sign out in the sidebar. English/Vietnamese can be selected before sign-in. The existing two-terminal development commands still work; `dev:api` also loads `.env.admin` and requires sign-in when a hash is configured.

This repository currently has `package-lock.json`, npm setup instructions and no pnpm workspace manifest. Commands above follow the actual project files.

## Authentication boundary

All workspace API routes require an admin session when configured. Sessions use random opaque cookies, HttpOnly, SameSite=Strict, an eight-hour absolute lifetime and server-side memory. Restarting the server invalidates all sessions, while preserving content. Login rotates the caller's prior session; logout revokes it. Five failed attempts lock login for the remaining fifteen-minute window across the single server. There is no registration, email recovery or Facebook password form. To recover, stop the service, move `.env.admin` to a protected backup, create a replacement locally, and restart. Do not delete the content database.

Public mode requires an exact HTTPS `SOCIALCHOICE_PUBLIC_ORIGIN` and the admin hash. Its cookies also use Secure. The Node server still listens only on loopback: a trusted HTTPS reverse proxy must preserve the configured Host, terminate TLS and forward to this private port. Never expose the unauthenticated development mode. Restrict direct port access. Origin, fetch-site and application-header checks protect browser requests; a public origin without an admin hash fails startup.

## Hosting handoff

Choose an existing VPS or Node host with a persistent disk before deployment. Required: Node 24+, one server process, durable database path, HTTPS reverse proxy, process supervision/restart, restricted secret files and backups. SQLite is suitable for this single-admin, single-process stage; do not launch multiple replicas or use ephemeral storage. Set `SOCIALCHOICE_DB_PATH` to the persistent volume location. No deployment, domain/DNS change or paid service has been performed.

Stop the API cleanly, copy its data directory to a protected backup, then restart. Test restoration on a separate stopped instance before relying on backups. Never commit data or `.env.admin`. The previous README's “production authentication not implemented” statement describes the earlier local mode; this document records the added opt-in admin mode. Cloud hosting, scheduled backup automation and Meta OAuth/publishing remain pending.
