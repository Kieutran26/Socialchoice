# Instagram integration code review

## Code Review Summary

### Scope

- Files reviewed: the Instagram connection, Graph, delivery, media capability and HTTP tests/modules; `facebook-publisher.js`; Facebook photo/video/scheduled/multi-page runners; Meta connection/Graph; local and Cloudflare entrypoints; validation; the web adapter; and the Instagram-aware account/composer/confirmation/preview UI.
- Lines analyzed: approximately 2,285.
- Review focus: plan compliance, OAuth and Facebook regression, server-only credentials, signed media delivery, durable write claims, alarm recovery, identity verification, and UI review fidelity.
- Updated plans: none. The requested review was limited to this report; `plans/261014-2039-instagram/plan.md` still says implementation in progress.

### Overall Assessment

The implementation is structurally sound and the focused source review found no confirmed production security or replay defect. Instagram attempts are separated from Facebook media runners, claim/stage state is persisted before provider writes, uncertain writes remain terminal and unreplayed, and publication requires a verified media ID, owner ID and HTTPS Instagram permalink. The repository gates are green after the HTTP fixture was updated to create the encrypted credential required by the capability endpoint.

### Critical Issues

None found.

### High Priority Findings

None found.

### Resolved During Review

- The signed media HTTP fixture now saves an encrypted credential matching the attempt's credential ID. The authorization guard remains intact, and the complete suite passes 92/92.

### Medium Priority Improvements

None confirmed from the inspected implementation. The plan's external live prerequisite remains open: no owner-linked Instagram account, OAuth grant, live publication or scheduled delivery was verified in this review.

### Low Priority Suggestions

None.

### Positive Observations

- OAuth state and nonce are session-bound; pending discovery exposes identities without access tokens, and Instagram credentials retain the linked Page ID in the encrypted vault.
- Instagram media capabilities bind the attempt, credential, asset storage ID and hash, expire after one hour, require an active processing attempt and connected matching account, reject forged/expired ranges, and stream in bounded chunks through Node and Cloudflare adapters.
- `instagram-delivery.js` persists create/processing/publish/verify stages before network I/O, retries only read stages, and treats post-publish authorization or transport uncertainty as `unknown` without resending.
- `facebook-photo-delivery.js` and `facebook-video-delivery.js` explicitly exclude Instagram attempts, while shared publisher/scheduler records retain the destination platform.
- Identity checks reject Page linkage changes and require the returned Instagram owner and HTTPS permalink before recording `Published`.

### Recommended Actions

1. Keep the external verification claim limited to the documented prerequisite state until the owner links the professional Instagram account, grants consent, and approves a real reviewed publication.

### Metrics

- Typecheck: passed (`npm run typecheck`).
- Build: passed (`npm run build`).
- Lint: passed (`npm run lint`).
- Tests: 92/92 passed (`npm test`).
- Confirmed critical/high production findings: none.

### Unresolved Questions

- When will the owner link the Instagram professional account to the target Facebook Page and authorize the required scopes for live verification?
