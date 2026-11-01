# Postiz backend integration

This connects the Socialchoice **web Node runtime** to Postiz for Facebook Pages. It does not deploy production, change the existing Meta Socialchoice app, or enable Postiz in customer Workers/desktop. Native accounts keep their existing backend.

## Private configuration

Set the four `SOCIALCHOICE_POSTIZ_*` server variables documented in [.env.example](../.env.example), in ignored `.env.local`. Use the Postiz Public API base URL ending in `/api/public/v1`, an existing API key and a stable independent random 32-byte hexadecimal encryption key. Never put keys in `VITE_*`, the browser, Git or screenshots. HTTPS is required except for loopback HTTP. Redirects are rejected so credentials cannot be forwarded to another origin.

Start the existing local API/frontend workflow from [README](../README.md). Configuration is opt-in; the account panel stays hidden when unconfigured or in demo/desktop mode. Local setup in this session uses `http://localhost:4007/api/public/v1`; container operations and Meta setup are recorded in [local setup](postiz-local-facebook-setup.md).

## User workflow

1. Open Social Accounts → Postiz channels → Load Postiz channels.
2. Choose an active live brand and explicitly select connected Pages to import. Reimport updates the matching brand/channel without duplicating it. Secrets and Facebook tokens never enter Socialchoice UI; only encrypted channel references are stored server-side.
3. Compose and save drafts normally, with shared/per-platform/per-account captions and stored media. The existing confirmation displays the exact destinations/content/time before sending or scheduling.
4. A Postiz channel uses Postiz for text, images or one video. Native destinations retain their original route. Multiple destinations retain independent results under the existing review.
5. Check access refreshes Postiz channel availability. Disconnect removes only the local Socialchoice association; it does not delete the channel from Postiz or revoke its Meta grant. Schedules recheck that association before starting.

## Scheduling and outcomes

Socialchoice owns the approved schedule and cancellation. Keep the local Socialchoice server running: when due it submits once to Postiz using `type: now`. It does not create a second independent remote schedule. Missed schedules follow the existing 15-minute cutoff. Cancellation is allowed only before submission starts.

Postiz acceptance means **processing**, never published. Socialchoice polls the exact remote post/channel and requires `PUBLISHED`, a remote publication ID and an HTTPS Facebook URL before recording success. Postiz `ERROR` becomes failed. Missing/invalid proof or continued unavailability eventually becomes unknown. The operation claim is persisted before remote creation; an interrupted or ambiguous write is not resent. A known remote request ID can continue being polled after restart. Review uncertain results in Postiz and on the Page before trying a new draft.

Native Graph analytics does not attempt to decrypt/use Postiz references. Postiz analytics import is not implemented; metrics remain unavailable for these publications. This does not prevent publication history from showing results.

## Verification and preview

- `node --test server/postiz-integration.test.js` exercises import isolation, approval changes, schedule cancellation, timeout and remote confirmation contracts with isolated transport fixtures, never live publishing.
- Existing regression suite: `node --test server/*.test.js`; also run lint, typecheck and build from package scripts.
- The local read-only acceptance retrieved TalentChoice and NextChoice through the actual Socialchoice adapter. Browser acceptance imported both into `data/postiz-preview.sqlite` and saved a Socialchoice draft for NextChoice. No remote post was created, scheduled or published.
- Isolated preview: after building, `node --env-file=.env.local plans/261101-2202-postiz-integration/local-preview.mjs`. Open `http://127.0.0.1:3001/accounts`. It binds loopback only and uses a separate database; it copies active brand names only on first initialization, never posts, credentials or queued jobs from the existing database. Stop with Ctrl+C. Do not run alongside another server occupying port 3001.

Real Facebook publication and token longevity remain unverified until an owner-authorized live publishing test.

## Rollback

Set `SOCIALCHOICE_POSTIZ_ENABLED=false` and restart the local API. Retain the private encryption key if keeping imported references for later reuse. Do not run queued Postiz schedules while disabled; inspect/cancel them before stopping the server. Existing native connections and production deployment are unaffected. Preview data is isolated in `data/postiz-preview.sqlite`; never delete the original workspace to reset a preview.
