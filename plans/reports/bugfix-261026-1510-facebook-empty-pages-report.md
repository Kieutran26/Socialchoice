# Facebook empty Page discovery repair

Status: complete; production verified on 2026-10-26.

## Evidence and cause

Official Meta Explorer reproduced empty `me/accounts` while the same Socialchoice USER token had granted Page scopes. Direct Deszy lookup returned a valid PAGE token; Meta inspection confirmed App/user/Page binding and granular publishing targets. This proves enumeration was insufficient for this existing grant; Meta's underlying reason for the empty edge remains unknown. No claim that optional Business Login configuration caused it.

## Delivered

- `server/meta-page-discovery.js`: bounded provider-granted candidates, independent USER/PAGE identity and validity checks, exact-token-bound private publishing proof. No fabricated tasks or user-supplied candidate IDs.
- `server/meta-graph.js`: Facebook-only fallback after completed empty enumeration.
- `server/meta-connection.js`: encrypted private proof persistence; explicit Page import retained; safe response metadata.
- `server/facebook-publisher.js`: existing task path or verified target-specific proof; existing scope and review requirements retained.
- `server/meta-page-discovery.test.js`: four regressions including actual Graph discovery and encrypted-store publisher preparation without publishing.

## Validation and release

Full backend suite 179/179 passed; lint, typecheck and diff checks passed. Required independent social-login review found no release blockers. Worker deployment bundled successfully. Worker version `0b8aa416-3da2-426f-8bba-3f080bb55e55`; previous compatible version `6c766241-20ba-45e3-88ae-7770ea0c6fc0`. Existing bindings/keys retained, no migration or frontend release.

Live OAuth reused the existing Kiều Trân profile and existing four Facebook scopes. Deszy appeared, was explicitly selected/imported into Test, and remained connected after the read-only access check. Existing Instagram connection retained; only two destinations present. Evidence: [discovery](facebook-empty-pages-proof/page-discovered.png), [connected result](facebook-empty-pages-proof/connected.png). No real publication, new grant, license action or Meta app configuration change.

Initial automatic-review denial required specific authorization for token inspection; the user subsequently supplied it. Inspection stayed in official Meta tooling; no token value was saved in source, reports or chat.

Limitations: app still unpublished; public customer eligibility requires separate Meta approval. Discovery bounds candidate count to 100 and may require two provider reads per candidate. Connected/access-check success is not proof of a newly published post. Actual publishing was deliberately not performed.

Unresolved: provider-internal reason for the empty accounts edge; no remaining blocker for the verified Deszy connection.
