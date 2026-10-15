# LinkedIn personal integration

Status: deployed; owner live OAuth sign-in pending.

Implemented personal connection, encrypted independent tokens, exact profile import, grant checks, public text/JPEG/PNG/MP4 posts and automatic schedules. Existing platform flows preserved. Company Page integration deferred by owner because no business email; LinkedIn requires a separate Community Management app.

Validation:136/136 tests; lint/typecheck/build; Worker bundle dry-run; independent code review. Confirmed invalid grants now expire only matching credentials. A speculative post-check race was rejected: final local identity check and provider fetch invocation execute synchronously before the first await; disconnect can stop future requests but cannot undo an already-started provider call. UI copy/docs state this boundary. Lost publish responses/crashes never resend. Synthetic browser publish and schedule confirmations show correct LinkedIn member, caption/public visibility/time; no external calls permitted by fixture.

LinkedIn personal rollout2026-10-15: reviewed Worker9e64bdd5-5eed-47d1-91f4-24eff5702b08 and Vercel dpl_9M5PGvY58V4tJXWDeeDS4D4F5qRC deployed via static-only .test-tools/linkedin-release. UI200/exact index-DCJDk-Dq.js match, health200, anonymous session/LinkedIn status401, policies and TikTok verificationfile200 verified. Existing namespace, actor, binding, migration, stable keys and other platform settings retained. Owner-approved callback saved; authenticated account screen shows LinkedIn ready and preserves Deszy+deszy_creative. Started real OAuth for active brand Test with only openid/profile/w_member_social and reached official LinkedIn sign-in; owner sign-in and grant/import pending. No real LinkedIn publication or schedule success claimed. Rollback references: previous Worker d06089b4-963d-44c5-8474-6530711cc65b and Vercel dpl_FG2vctBTwBGXK5AatbpcTXV97WLD. Retain private keys; do not restore a runner without LinkedIn support while LinkedIn jobs are queued/processing.

No live LinkedIn grant, import, post, media upload or automatic schedule success claimed yet. No Git commit/push made for LinkedIn.

Unresolved: owner must sign in on LinkedIn and grant access; then explicit profile selection and owner-approved live post/schedule test. Company app waits business email.
