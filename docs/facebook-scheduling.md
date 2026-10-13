# Facebook automatic scheduling

Create Post → choose one connected Facebook Page → enter caption/media → choose date, time and timezone → Schedule post → review the exact Page, caption, ordered media and time → Confirm automatic schedule. This requires pages_manage_posts and Page content permission. Choose at least one minute in the future.

Approved schedules persist privately and use the same Cloudflare Free Durable Object alarm as media delivery. The browser may close. Upload/publication starts at the selected time; Facebook processing can delay visibility, especially video. Local Node mode requires its server to remain running.

Open the post's details to see automatic scheduling and cancel before execution starts. Cancellation restores an editable draft. To change the time/content, cancel, edit and confirm a new schedule. Once execution is claimed it cannot be cancelled in Socialchoice. Existing calendar plans and sample data do not become real automatic deliveries without fresh review and approval.

The server revalidates the content, destination and credentials at execution. It persists the claim before any remote write. Alarm replay, transport uncertainty and restart never cause an automatic resend. Older-than-15-minute missed schedules fail safely. Duplicate a failed/unconfirmed post only after checking the Facebook Page. Published requires a real confirmed result.

Status: implemented and locally verified. Owner-approved text schedule for14:40 on2026-10-13 was confirmed Published by the real backend, and the owner reports Facebook success. Scheduled photo/video publication remains unverified live; their approved snapshots and shared delivery flow are tested locally. Tests cover approval vs planning, exact snapshot locking, early execution refusal, cancellation, missed time, permission revocation, persistence/re-arm and endpoint authentication/origin checks. No simulated successful Meta delivery is used as proof.

Operations: preserve namespace, keys and single-admin identity. Shared alarm always selects the earliest queue/media checkpoint. No paid service or independent cron is added. Before rolling back to code without queue support, cancel every unstarted automatic schedule and ensure no media delivery is processing; older code cannot execute new queued approvals. Storage rollback is separate from code rollback.

Reference: [Cloudflare alarms](https://developers.cloudflare.com/durable-objects/api/alarms/).
