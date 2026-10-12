# Meta callback diagnosis

Observed: Meta permission pages_read_engagement added with owner approval and ready for testing. Subsequent OAuth redirects to /accounts?meta=failed after callback state validation, so failure is inside brand check, token exchange, Page discovery or private pending persistence. Original catch suppresses the reason; cannot truthfully infer which upstream operation failed.

Change: safe per-owner-session diagnostic persists only known step and numeric Meta code/subcode in the existing encrypted pending store. No upstream message, URL, OAuth code, token or App Secret is exposed. Failed selections cannot be imported. UI uses existing design and Vietnamese labels.

Validation:30tests pass, typecheck, focusedUIlint and frontend/Worker builds pass. Independent review and real retry pending. No fake API success/data added. No local credentials read or printed.

Unresolved: actual upstream failure stage/code from a fresh real OAuth attempt, then cause-aligned repair and real Page discovery.
