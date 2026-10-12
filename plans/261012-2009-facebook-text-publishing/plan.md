# Facebook text publishing

Outcome: real Publish Now for a text draft to one authorized Facebook Page. Preserve UI, local/cloud persistence, Vietnamese labels and free hosting.

Constraints: backend Page token only; owner-reviewed canonical snapshot; publishing scope and Page task required; platform ID confirmation only; no fake statuses or live test without exact owner approval. Calendar plans remain plans; media/multi-Page execution and scheduler are subsequent work.

Implementation: private persisted attempt + immutable variant, atomic claim before HTTP, public history protected from forged status, no automatic resend after uncertain outcome. Unknown outcomes require checking the Page; repeated requests for same attempt never publish twice.

Acceptance: validation/credential/history/idempotency checks, Node and actual Workers runtime, UI confirm exact Page/caption, authorized real Meta text publish with returned ID and verified link. No secrets in output/Git/client.

Phases: inspect/docs; implement server/storage/Graph; UI confirmation/localization; tests/review; deployFree; owner scope/reconnect and concrete post approval; live verification.

Status: implementation, 34 tests, lint, typecheck, production build and independent review complete. Backend deployed on existing Free Worker (d88e407a58cd4dde8d92b7c9f3683ae5); public health reports text_publish_now and admin-session. Vercel UI deployment FYDEfjiPHxzzsQrxkKRHRpdjZXVa from 411b241 succeeded; Vietnamese Publish now and the connected Deszy Page were inspected online. Follow-up cancellation/history checks passed (12 focused tests). No Meta publishing permission changed and no real post sent. Real publication acceptance remains pending owner scope/reconnect and exact Page/content approval.
