# UTM Builder and Link Tracking

Outcome: explicitly apply campaign tags per publishing destination and optionally count public redirect requests inside Socialchoice.

Constraints: preserve composer settings and approval flows; no automatic publication; isolated customer storage; no visitor IP, cookie or user agent persistence. No deployment.

Acceptance: preview before apply, preserve existing UTM by default, immutable scoped redirects, authenticated management, durable totals/daily counts, disable action, focused tests and existing checks passing.

Phases complete: shared URL transformation and persistent tracking; composer integration; anonymous customer routing/auth checks; documentation and browser verification. Independent review identified an external-URL skip issue; fixed with explicit owned origin and regression coverage.
