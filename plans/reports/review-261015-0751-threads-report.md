# Threads integration code review

## Code Review Summary

### Scope

- Files reviewed: Threads config, OAuth/Graph, delivery, tests, setup scripts, publisher/scheduler/media runners, HTTP/runtime/Cloudflare adapters, schema/validation, account/composer UI, package and environment configuration, and the Threads documentation.
- Review focus: `plans/261015-0751-threads/plan.md` acceptance criteria; credential separation, OAuth binding/replay, encrypted storage, durable delivery claims, signed media, schedule recovery, Facebook/Instagram isolation, and setup secret handling.
- Updated plans: none; this was a review-only assignment and the plan remains owned by the implementing session.

### Overall Assessment

PASS. No release-blocking code findings were identified in the inspected Threads integration. The implementation keeps Threads configuration, Graph calls, credentials, account metadata, and delivery runners separate from Facebook/Instagram while reusing the existing durable scheduling and encrypted storage primitives.

### Critical Issues

None found.

### High Priority Findings

None found.

### Medium Priority Improvements

None found in the requested scope. The only outstanding boundary is external: the Threads product secret has not been supplied, so live OAuth, account import, media fetchability, publication, and scheduling remain unverified by design.

### Low Priority Suggestions

None required for this release.

### Positive Observations

- `server/threads-config.js`, `server/threads-graph.js`, and `server/threads-connection.js` use distinct Threads credentials and endpoints; no Facebook App ID, App Secret, token, or Graph client is used as a fallback.
- OAuth state is consumed before exchange, the nonce is bound to the admin session through an HttpOnly callback cookie, pending flow IDs reject superseded callbacks, and logout/expiry checks prevent stale imports. The callback returns only safe diagnostic data.
- `threadsTokenDetails()` verifies the actual app ID, profile ID, required granted scopes, and expiration. Imported tokens are stored through the encrypted credential vault and are absent from profile/status responses and setup output.
- `threads-delivery.js` claims create and publish stages durably before network I/O, retries only bounded read stages, and leaves interrupted or post-publish-uncertain attempts `unknown` without automatic resend. Final publication requires owner identity and a Threads permalink.
- Signed media uses a Threads-specific HMAC prefix/key path, checks the active processing attempt, exact immutable asset, connected account/profile, encrypted credential, required scopes, and token expiry. Existing Instagram signatures retain their legacy payload compatibility.
- Facebook photo/video runners explicitly filter to Facebook attempts, while Threads-only configuration can prepare/publish independently when Facebook is unavailable.
- Setup uses a hidden PowerShell prompt, stdin for the local secret handoff, refuses to overwrite `.env.threads`, uploads only `THREADS_APP_SECRET` through Wrangler stdin, and does not print credential values.

### Recommended Actions

1. Keep live Threads rollout gated on owner authorization for the private product-secret transfer and a real approved test. Do not mark live OAuth/publication success from the synthetic contract tests.
2. After the owner supplies the secret, run one real text test followed by one approved JPEG/MP4 test and one future schedule test; verify the stored profile, exact permalink owner, and unconfirmed-write behavior against the live API.

### Metrics

- Type coverage: not measured; `npm run typecheck` passed.
- Test coverage: full server suite passed, 110/110; focused Threads connection, delivery, HTTP, signed-media, and setup tests passed.
- Linting issues: 0 (`npm run lint`).
- Build: passed (`npm run build`).
- Diff hygiene: `git diff --check` reported no whitespace errors.

### Unresolved Questions

- Live Threads token exchange, provider container statuses, remote signed-media fetches, and publication permalink shape still require owner-authorized credentials and cannot be proven from synthetic tests.
