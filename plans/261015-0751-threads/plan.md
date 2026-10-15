# Threads integration

Outcome: connect one explicitly selected Threads profile; review and publish text or one stored photo/video; confirm automatic scheduling with independent durable results. Existing Facebook and Instagram remain supported.

Constraints: distinct Threads app credentials/OAuth/token, same private encryption key and SQLite backend, no paid service or automatic resend of uncertain writes. Request only threads_basic and threads_content_publish. No replies, Insights, deletion, search, carousel or Threads-to-Instagram sharing requested. Real grant and publication require owner authorization.

Acceptance: session+nonce-bound OAuth with callback replay prevention and verified identity/scopes/expiry; encrypted independent credential; no invented connected/published state; signed media limited to active reviewed attempt; durable claims before create/publish; only read stages retry; post-publish uncertainty nonretryable; bounded status poll/alarm reconciliation; owner/permalink verification; preflight for text500characters or single photo/MP4; FB/IG regressions, full checks and independent review pass.

Work: connection/config/Graph worker; delivery/media worker; controller HTTP/runtime/schema/frontend/setup/docs; independent review and existing cloud/UI release. Meta Threads use case and content permission added, owned HTTPS callback saved. Threads app secret remains private, not revealed or transferred yet.

Status: implementation, 110-test verification, independent review and production deployment complete. Private secret setup and live owner-authorized verification pending. No live Threads grant, import, publication or schedule execution claimed.
