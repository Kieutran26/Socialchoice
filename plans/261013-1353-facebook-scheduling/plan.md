# Facebook scheduled delivery

Outcome: explicit reviewed automatic delivery for one connected Facebook Page, text/photos/video, persists on Free Worker while browser closes. Preserve UI and no-resend publishing checkpoints. Existing calendar plans never become automatic without approval.

Implement private queued approvals in current publish-attempt storage; share earliest alarm with active media. Future UTC time; exact caption/Page/media confirmation. Revalidate credential/content at execution. Late recovery allowed up to 15 minutes; older due items fail safely rather than surprise-post. Cancellation before claim restores editable draft; changing schedule requires cancel then new confirmation. No automatic resend of uncertain writes.

Validation: queue/expiry/cancel/restart/missed time/security tests without mocked Meta success, existing publisher tests, lint/type/build, reviewer, deploy and UI review. Real scheduled Facebook test requires separately approved Page/caption/media/time.
