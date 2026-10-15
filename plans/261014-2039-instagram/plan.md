# Instagram integration

Outcome: connect a Facebook-Page-linked Instagram professional account, review and publish stored photos/video, schedule durable delivery with confirmed result/history. User chose full scope; current Instagram is not linked to Deszy yet.

Constraints: preserve existing Facebook/OAuth/history, same private SQLite and secrets, no paid provider, no automatic resend of uncertain writes. OAuth owner consent and real Page linkage remain external prerequisites. No Threads, Instagram insights, inbox or Stories in this scope. Photo feed/carousel and one video Reel supported only with validated Meta contracts.

Work: Instagram OAuth/discovery/import/check/disconnect; server delivery/container state and expiring media capability; composer/account UI plus bilingual guidance; focused tests then existing quality gates; independent code review. Connection and delivery ownership separate; controller integrates UI/runtime/routes/docs.

Acceptance: Facebook default unchanged; no fabricated connected/published state; credentials server-only; media capability scoped to approved active attempt and expires; exact content/identity reviewed; claimed writes durable before network; uncertain writes never replay; alarm persists/reconciles schedules; publish requires verified media ID/permalink; tests/lint/typecheck/build pass. Real Instagram success only after owner linkage/consent and explicitly reviewed publication.

Status: implementation, isolated validation, independent review and online rollout complete. Final92/92tests, lint/typecheck/build and cloud dry-run passed. Live verification pending owner professional-account linkage and required Meta grant. See [delivery report](../../plans/reports/instagram-integration-261014-2039-socialchoice-report.md) and [review](../../plans/reports/review-261014-2039-instagram-report.md).
