# Facebook empty Page selection investigation

Status: provider response reproduced; no code/config/permission change deployed.

Subsequent update: the user explicitly authorized the specific official Meta token inspection. It verified a valid Socialchoice PAGE token for Deszy with target-specific publishing grants despite empty enumeration. The inspected token was not persisted or printed. A bounded, validated discovery fallback was then implemented and deployed; see [completion report](bugfix-261026-1510-facebook-empty-pages-report.md). The status above describes the initial read-only investigation, not the final release.

## Verified evidence

- User screenshot: Socialchoice recognized Facebook identity but had no selectable Pages.
- Read-only Facebook Business Integrations inspection: Socialchoice active; Deszy selected for Page listing, content read, user-content read and publishing. Existing Instagram permissions selected for its linked profile.
- Facebook profile switcher includes Deszy. Page access view identifies a business portfolio owner. No invitations, access changes or removals performed. Inspection temporarily switched to Page identity, then restored the original personal identity.
- Meta App dashboard shows unpublished status; Login for Business configurations view contains no saved configuration. This is a separate readiness concern, not proven as the immediate empty-list cause. Official documentation allows optional configuration ID for a manual login flow.
- Graph API Explorer selected actual Socialchoice App, existing token, v26.0. GET `me/accounts?fields=id,name,tasks` returned `data: []`. GET `me/permissions` returned granted Page listing/read/publishing and existing Instagram permissions. Thus the empty result also exists outside the Socialchoice UI.
- GET known Page ID with `fields=id,name` returned Deszy. This establishes identity lookup access, not publishing capability or Page-token availability.

## Safety boundary and outstanding diagnosis

A query requesting the Page access_token field was sent, but its result inspection was blocked by automatic approval review because it could reveal a credential and lacked specific authorization. No result token was read, saved, copied or returned. Continued only with `fields=id,name`, without tokens. Further credential inspection needs explicit user authorization. Do not implement a credential-reading workaround for the rejected action.

No token, private key, recovery code or password is included in this report. No real post, reconnect grant, license action, app publication, permission grant or persisted login configuration change performed. No tests run because no implementation changed.

References inspected through authenticated browser: [User Accounts reference](https://developers.facebook.com/docs/graph-api/reference/user/accounts), [Pages getting started](https://developers.facebook.com/documentation/pages-api/getting-started), [Login for Business](https://developers.facebook.com/documentation/facebook-login/facebook-login-for-business).

Unresolved: why this existing grant enumerates zero Pages despite direct Page identity access; whether fresh consent/configuration or another verified discovery route resolves it. Direct Page-token inspection remains unverified and requires explicit authorization after automatic-review denial.
