# License revocation

Status: deployed and verified, 26 October 2026. User requested adding revocation to owner license management. See [delivery report](../reports/feature-261026-1230-license-revocation-report.md).

Outcome: owner chooses a web-issued license, confirms revocation, sees durable revoked status. Central directory rejects activation/login/recovery and all old sessions; customer request/media/background entry points and each subsequent provider call check central status. Data and history stay stored. Already submitted provider actions may complete. No restore, deletion, refund or new license generation implied.

Design: encrypted directory revocation registry; backend-only domain-separated HMAC authority calls through existing Durable Object binding. Public Worker cannot route internal authority paths. Owner service commits central denial before local status to fail safely on partial persistence. Exact retries reconcile and preserve the first revocation date. Customer/anonymous calls denied; owner keys/namespaces unchanged.

Validation: actual bundled Workers activated and unactivated licenses, multi-session denial, unaffected other customer/owner, recovery denial, restart persistence, forged internal messages and customer revoke denial; provider-call guard with mid-loop revocation/outage. UI confirmation/cancel/status/download-disable at1440/390; review, matching production deploy, read-only actual HTTPS checks. Never revoke a real production license during tests.
