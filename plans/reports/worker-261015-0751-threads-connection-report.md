# Threads connection and Graph implementation

Status: DONE

Implemented independent Threads configuration, nonce/session-bound OAuth, short-to-long token exchange, profile identity and granted-scope verification, explicit profile import, encrypted private credentials, reconnect/access check and disconnect. Graph supports reviewed text/image/video containers, status, publish and owner/permalink verification. No live OAuth consent or publication performed.

Owned files: server/threads-config.js, server/threads-connection.js, server/threads-graph.js, server/threads-connection.test.js, server/threads-http.test.js, server/setup-threads.test.js.

Configuration uses THREADS_APP_ID/SECRET/REDIRECT_URI and the existing stable META_TOKEN_ENCRYPTION_KEY. It never falls back to Facebook app credentials. Callback is exact /api/threads/callback, HTTPS or local loopback; configured SOCIALCHOICE_PUBLIC_ORIGIN must match. OAuth state and pending maps are injectable for persistent runtime adapters. Scope/expiry data comes from read-only /debug_token rather than assuming requested scopes were granted. Credential lifetime is the minimum of exchange and debugger expiry. No automatic refresh.

Callback nonce is independent of Facebook/Instagram. Replay, cancellation, session expiration during async exchange and superseded OAuth requests cannot import stale credentials. Access checks cannot mark a newer credential expired after a late older-token rejection. Only code190 or known stored expiration marks expiry; identity mismatch remains an error.

Validation: 11 focused tests passed and owned-file ESLint passed. Fixtures are explicitly synthetic network contracts; SQLite credential persistence/encryption and HTTP adapters are real. After controller restored the shared unconfigured publisher guard, final full server suite passed110/110 tests.

Primary documentation:
- [Meta Threads collection](https://www.postman.com/meta/threads/documentation/dht3nzz/threads-api?entity=request-34203612-74fb48b1-ad1a-480e-b200-4dcdb8126a2f)
- [Code exchange](https://www.postman.com/meta/threads/request/bl7bd9h/exchange-the-code-for-a-token)
- [Long-lived exchange](https://www.postman.com/meta/threads/request/34203612-e19a804d-ed93-45cd-82f8-7b8110a60744)
- [Profile](https://www.postman.com/meta/threads/request/q9os31a/get-threads-user-s-profile-information)
- [Debug token](https://www.postman.com/meta/threads/request/mm48yqc/debug-access-token)
- [Container status](https://www.postman.com/meta/threads/request/m47wqlq/check-container-s-publishing-status)

Unresolved: actual Threads OAuth/token-debugger behavior and live publication require owner consent and configured product secret; synthetic fixtures do not prove live success.
