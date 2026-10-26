# Customer license tracking

Status: deployed and verified26October2026. [Delivery evidence](../reports/feature-261026-1300-customer-license-tracking-report.md).

Outcome: owner sees activation status/date and latest successful sign-in for recent web-issued licenses; searches email/name and filters license/activation status; explicit refresh retrieves current account state. Preserve issuance/revocation and existing design. No account recovery override, tier limits or data deletion.

Design: encrypted directory accounts record activation/sign-in timestamps; existing accounts retain unknown historical dates. Bounded signed internal batch lookup returns only activation metadata for requested license IDs. Owner list awaits enrichment; missing authority fails rather than reporting false pending state. No credentials/session/recovery data exposed.

Validation: focused directory tests with legacy records, failed sign-in, recovery, revocation and persistence; actual Workers owner/customer boundaries and enriched history; UI search/filter/refresh at desktop/mobile; types, lint, build, required reviewer; matching production deployment and read-only HTTPS checks. Never activate/revoke real customer licenses for tests.
