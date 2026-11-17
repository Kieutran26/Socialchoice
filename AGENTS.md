# AGENTS.md

## Project Context

This is a Base44 app repository. Treat it as user-owned application code, keep changes focused on the user's request, and preserve existing project conventions.

Start with `README.md` for local setup, environment variables, and publish workflow.

## UI Design Contract — Required

Before creating, changing or reviewing UI, MUST read [docs/design-system.md](docs/design-system.md) and the affected shared components. This is the Socialchoice design contract for all AI agents and contributors. Preserve its tokens, typography, icons, skewed primary buttons, component patterns and responsive layout. Do not redesign or change global styles unless the user requests that scope. Reuse existing components; follow the anti-drift checklist and update the contract alongside intentional design changes.

**UI/UX Standard Skill**:
All UI/UX design, component styling, layout architecture, responsive behaviors, accessibility standards, and interaction states MUST adhere to the standard UI/UX skill located at:
`C:\Users\MECHREVO\.agents\skills\ui-ux` (read `C:\Users\MECHREVO\.agents\skills\ui-ux\SKILL.md` and its `references/` before authoring or modifying UI).

## Critical Constraints for AI Agents: Auth Lifecycle & Cloudflare Quotas

All AI agents working on this repo MUST adhere to these architectural safety rules:

1. **Strict Separation of Auth Initialization vs. State Sync (`src/lib/AuthContext.jsx`)**:
   - `initAuth()` runs ONCE on mount (`useEffect(..., [])`).
   - NEVER add `[rawUser]` or any newly-allocated state object to an effect that calls `initAuth()` or `/api/session` — this previously caused an infinite API loop that burned Cloudflare's 100,000 daily Durable Objects quota in minutes.
   - Member overlay synchronization MUST be purely local/synchronous (`[rawUser, syncEffectiveUser]`) with ZERO network calls.
   - Event handlers for `socialchoice:team` and `socialchoice:auth` MUST read `rawUserRef.current` to prevent stale closures without re-subscribing.

2. **Web vs Desktop Error Boundaries**:
   - On Web (`!isDesktop()`): NEVER auto-login with `'admin'` or fabricate a `'local-owner'` user on auth/network failure. Unauthenticated sessions must cleanly render `<AdminSignIn />`.
   - On Desktop (`isDesktop()`): Single-user offline fallbacks (`'admin'`, `'local-owner'`) are reserved exclusively for the Tauri desktop runtime.

3. **Non-JSON & Cloudflare Error Sanitization (`src/api/app-client.js`)**:
   - When backend returns HTML (e.g. Cloudflare Error 1101, Nginx 502/504) or non-JSON text, NEVER leak raw responses/tags to the user.
   - Sanitize to: `"Máy chủ đang tạm thời không khả dụng. Vui lòng thử lại sau."` while preserving `error.status`.
   - This error MUST NOT match session-expired patterns (`Sign in required`), preventing retry loops.

4. **Polling and Background Intervals**:
   - Keep polling intervals at 5 minutes (300,000ms) or longer (`Overview.jsx`, `Shortlinks.jsx`, `PublishingNotifications.jsx`).
   - Always gate execution with `document.visibilityState === 'visible'` (or `!document.hidden`).

5. **Local Development & Demoing**:
   - Use `.env.local` with `SOCIALCHOICE_LOCAL_API=true` to proxy `/api` calls to the local SQLite backend (`http://127.0.0.1:3002`).
   - The local backend is 100% self-contained, owner-ready (`admin`), and completely immune to Cloudflare quota limits.

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
- `src/lib/AuthContext.jsx`: authentication state and member overlay.
- `src/api/app-client.js`: HTTP request client, error sanitization, and event dispatch.
- `vite.config.js`: Vite config and Base44 Vite plugin setup.
- `.env.local`: local-only environment values; never commit secrets.
- `ROADMAP.md`: platform architecture, incident post-mortems, and upcoming milestones.

## Working Notes

- Use `base44 dev` as the default local development command when you need the local Base44 backend. It can run the backend and frontend together.
- When docs or code mention the frontend being started automatically, that usually means the Base44 project config includes `site.serveCommand`, for example `"serveCommand": "npm run dev"` in `base44/config.jsonc`.
- Use `npm run dev` only for frontend-only work against the hosted Base44 backend.
- Prefer the existing Base44 CLI workflow over adding new npm scripts for Base44-specific tasks.
- Reuse the existing SDK client and Vite plugin patterns before adding new Base44 integration paths.
- Run the relevant checks from `package.json` before finishing code changes.
