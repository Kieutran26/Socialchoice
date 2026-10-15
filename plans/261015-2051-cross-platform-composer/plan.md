# Cross-platform composer

Status: complete (local implementation; live rollout outside this task)

Outcome: compose once for Facebook, Instagram, Threads, TikTok and LinkedIn; customize captions, review format issues before publishing/scheduling, retain destination results.

Constraints: existing brand boundaries, private storage, adapter limits, immutable confirmation and no resend of uncertain writes. Shared media; no new providers or live publishing/deployment in this task.

Non-goals: new platform formats, OAuth changes, platform-specific media, analytics.

1. Inspect existing composer, adapters and grouped approvals. Complete: grouped execution already supports mixed platforms; platform captions are hidden/reset and duplicate detection ignores platform.
2. Complete: caption precedence/persistence, channel-neutral labels, per-destination checks and platform-qualified identity.
3. Complete: 144 tests passed, lint/types/build passed; browser verified validation, caption reopen/preview, three-channel exact review/schedule and independent cancellation. Fixture stopped.
4. Complete: docs and independent review; findings fixed and follow-up review clean. See [validation record](../reports/cross-platform-composer-261015-2051-socialchoice-report.md).

Acceptance: shared/platform/account captions match preview and immutable review; incompatible media/length shown for every selected account; draft/edit/duplicate retain overrides; group confirmation is atomic and repeat-safe; results remain independent. Existing single-channel behavior passes regression tests.
