# Meta callback diagnosis

Observed: Meta permission pages_read_engagement added with owner approval and ready for testing. Subsequent OAuth redirects to /accounts?meta=failed after callback state validation, so failure is inside brand check, token exchange, Page discovery or private pending persistence. Original catch suppresses the reason; cannot truthfully infer which upstream operation failed.

Change: safe per-owner-session diagnostic persists only known step and numeric Meta code/subcode in the existing encrypted pending store. No upstream message, URL, OAuth code, token or App Secret is exposed. Failed selections cannot be imported. UI uses existing design and Vietnamese labels.

Validation:30tests pass, typecheck, focusedUIlint and frontend/Worker builds pass. Independent review and real retry pending. No fake API success/data added. No local credentials read or printed.

Unresolved: actual upstream failure stage/code from a fresh real OAuth attempt, then cause-aligned repair and real Page discovery.

Root cause verified by actual workerd transport probe: redirect:error is rejected synchronously with TypeError; supported modes are follow/manual. This explains code_exchange network failure before any HTTP response. Local real Meta app-credential validation returned200 JSON (only safe status/type/boolean output; no secret/token shown).

Repair: redirect:manual and reject all3xx before parsing, so credentials never follow redirects. Additional reason/httpStatus fields remain allowlisted and numeric; encrypted/session-scoped. Independent privacy/security review found no blockers.30tests/type/UIlint/Worker+frontendbuild pass. Existing bundle-size warning unchanged.

Deployed: Cloudflare via existing connector preserving five secret bindings and the same SQLite namespace (latest deployment5a8bac99e55a4adab329c2ff782e623a). Git commit eec6572. Vercel transient Git retrieval failure on2db7154 resolved by same-source redeploy Bd4dxqMX65scYCjvFXGux6Yrw41t Ready. No paid upgrade, data reset, or secret rotation.

Real end-to-end evidence after fix: existing Meta authorization settings reused; callback redirects meta=select; authenticated UI shows one real Page from Graph API. Thus authorization code/long-token exchanges, profile, permissions and Page discovery verified on live backend. Tokens not displayed/logged. Page selection/import not executed by agent; owner chooses final Page. Publishing remains unavailable. Screenshot kept locally, not added to Git.

Current unresolved: owner Page selection/import. Reported callback failure repaired. All agent-started probes/build processes exited.
