# Postiz integration — complete locally

Outcome: Socialchoice web local/staging imports connected Postiz Facebook channels, composes drafts with existing UI, confirms immediate/automatic scheduled delivery through Postiz, and records actual remote outcomes.

Constraints satisfied: no production deployment/configuration changes, no live publication, private server-only API key, native connections preserved, brand/demo isolation, immutable approvals and uncertain-write protection. Socialchoice owns scheduling and sends to Postiz when due; keep local API running.

Phases: inspection complete; server adapter/delivery complete; account-selection UI complete; tests/review complete; private local configuration and read-only acceptance complete.

Acceptance: 279 tests, lint, typecheck and build pass. Browser imported TalentChoice and NextChoice into isolated preview and saved a draft; desktop/390px reviewed. No real publication claimed.

Evidence: [acceptance report](../reports/postiz-integration-261101-2202-local-acceptance-report.md). Operations: [guide](../../docs/postiz-integration.md).

Non-goals: production deployment, desktop migration, replacement of customer authentication/storage, redesign, analytics import or additional providers not connected in this Postiz instance.
