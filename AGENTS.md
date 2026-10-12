# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## Base44 References

- CLI overview: https://docs.base44.com/developers/references/cli/get-started/overview.md
- Agent skills: https://docs.base44.com/developers/backend/overview/skills.md

If your agent supports Agent Skills, install or update Base44 skills before Base44-specific work:

```bash
npx skills add base44/skills
```

## Key Files

- `src/`: frontend application source.
- `src/api/base44Client.js`: frontend Base44 SDK client.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.

## Base44 sandbox (docker compose)

Bring the app up with `docker compose -f docker-compose.base44.yml up -d --build`. It serves on host port 3000 and needs no external credentials to boot or to show the workspace.

One container runs the two processes the README's two-terminal dev pair uses:

- `npm run dev:api` — the owned Node/SQLite API on 127.0.0.1:3001. Its database is `data/socialchoice.sqlite` in the `app_data` volume, so it survives restarts.
- `npm run dev -- --host 0.0.0.0` — the Vite dev server on 5173, published as 3000, proxying `/api` to the API in the same container.

Only the Vite port is exposed, so the API keeps its loopback bind and its host/origin checks. `node_modules` lives in the `node_modules` volume and is re-installed from `package-lock.json` on start whenever that lockfile changes. The image is `node:24-slim` because `package.json` requires Node >= 24 (the sandbox host's Node may be older). The compose healthcheck probes both processes (Vite on 5173, `/api/health` on 3001) with the Node runtime already in the image.

### Sandbox-only overrides, gated on `BASE44_PREVIEW_MODE`

- `server/index.js` adds the preview host suffix (`BASE44_SANDBOX_HOST_DOMAIN`, matched as a `.domain` wildcard because the sandbox id rotates) and the preview origin (`https://3000-<BASE44_PUBLIC_HOST_SUFFIX>`) to the API allowlists, only when `BASE44_PREVIEW_MODE === "1"`. With the flag unset both lists are exactly as before, and requests from any other host or origin are still rejected with 403.
- The Vite dev server learns the preview host from `__VITE_ADDITIONAL_SERVER_ALLOWED_HOSTS` in compose, so `vite.config.js` needs no sandbox branch.
- Never hardcode a resolved `BASE44_*` value in a file; compose passes the variables through.

### Verifying it works

- `curl -fsS http://localhost:3000/` returns `index.html` referencing `/src/main.jsx` — live source, not a prebuilt bundle.
- `curl -fsS http://localhost:3000/api/health` returns `{"backend":"sqlite",...,"mode":"local-only"}`.
- Smoke test through the UI: Settings → "New brand" → fill the name → Save; the brand appears in the list and in `POST /api/entities/Brand/filter`. Deleting that row asks for confirmation and removes it. Use that round trip and delete whatever you created.
- The preview browser opens the workspace in Vietnamese, so match the localized label text rather than assuming English strings.
- `docker compose -f docker-compose.base44.yml exec -T app npm test` runs the Node test suite inside the container.

### Credentials

No external service is needed to run the app. The optional Facebook Page connection is the only integration with credentials; it stays disabled and visibly "configuration required" without `META_APP_ID`, `META_APP_SECRET`, `META_GRAPH_VERSION`, `META_TOKEN_ENCRYPTION_KEY` and a matching `META_REDIRECT_URI` (see `docs/facebook-connection-setup.md`). Those values are server-only and belong in platform secrets, never in `VITE_*` variables or committed files.
