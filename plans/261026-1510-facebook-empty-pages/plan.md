# Facebook empty Page enumeration

Status: completed, deployed and verified in production. Worker `0b8aa416-3da2-426f-8bba-3f080bb55e55`; Deszy discovered, explicitly selected/imported, and remained connected after its access check. No publication performed. Full suite 179/179, lint/typecheck and required review passed. See [completion report](../reports/bugfix-261026-1510-facebook-empty-pages-report.md).

Outcome: discover authorized Pages even when Meta returns an empty me/accounts edge; preserve explicit selection/import, customer isolation and publishing permissions. No hardcoded customer Page, added OAuth scopes, app publication or automatic post.

Evidence: actual Socialchoice USER token identifies Kiều Trân; me/accounts returns data[]; all requested scopes granted; direct known Page returns a PAGE token. Meta debug confirms is_valid, matching Socialchoice App and Deszy profile. Direct Page object does not support tasks. Token inspection explicitly authorized by user after initial auto-review denial. No token values retained in source/report.

Design: only after empty enumeration, inspect existing user grant via Meta debug_token; use provider-returned pages_show_list target IDs as bounded candidates. Fetch each specific Page token and validate type/app/profile/user binding. Preserve provider task metadata where available; never invent CREATE_CONTENT. A private token-bound, target-specific verified publishing grant can satisfy preflight alongside legacy tasks. Preserve standard scope checks and central revocation. Import remains explicit.

Validation: regression fixtures for empty enumeration, valid and invalid target grants, app/profile/user mismatch, token expiry, credential proof binding; existing Meta/publishing tests, full tests/types/lint/build as applicable; required review; same Worker deploy and live reconnect/import without posting.
