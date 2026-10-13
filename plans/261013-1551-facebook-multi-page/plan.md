# Multi-Page Facebook delivery

Status: implemented and verified locally. Outcome: one owned post to 1–30 connected Facebook Pages, shared media, optional Page caption/time, individually tracked/cancellable execution and reviewed retry of confirmed failures.

Constraints: retain current UI and local/Cloudflare SQLite runtime, existing private tokens/media/alarms, single-Page behavior, no paid service, no automatic resend of uncertain operations. No live Facebook write without exact content/Page approval.

Acceptance: atomic approval and durable per-Page claims; immutable content checks survive sibling status transitions; permission failure isolates one Page; repeat approval/restart cannot replay a remote write; Published requires every destination confirmed; failure retry cannot target published/processing/unknown destinations. EN/VI UI with responsive review and per-Page history.

Steps: migrate attempt storage preserving legacy records; implement per-Page review/queue/aggregation/retry; composer overrides/preview/review/history; regression and persistence/auth tests; independent review; update owning docs and verify browser where available.

Bulk draft scheduling continues to require one Page per draft in this change. Multi-Page posts use composer review. No additional platform or metric work.

Validation:72 server tests, type/lint/build/diff checks and isolated browser flow375/768/1440 EN/VI pass. See [verification report](../reports/facebook-multi-page-261013-2040-socialchoice-report.md). No online rollout/live Meta publication performed.
