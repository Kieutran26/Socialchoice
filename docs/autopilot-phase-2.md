# Autopilot Phase 2: reviewed content strategy

The strategy UI calls the authenticated Autopilot backend. It does not generate marketing claims from local templates. No deployment is included in this change.

## Use

1. Select one active, live brand. Configure its products, audience, tone, goals and posting frequency in Brand Knowledge Base.
2. Configure the existing AI provider in Settings and enable Autopilot with server encryption configured, as documented in Phase 1.
3. Supply at least 20 eligible images: privately uploaded images, or available Drive/R2 images whose analysis has been approved. Demo/sample URLs do not qualify.
4. Choose 7, 14 or 30 days, frequency and platforms. Confirm sending brand facts and asset descriptions to the configured provider. No image bytes are sent for strategy generation. Provider charges can apply.
5. Review cards or the table, edit topics/captions/pillars/angles/platforms/time/assets, remove items, or confirm generation of one replacement idea.
6. Apply once reviewed. Source images are downloaded through version-checked providers and imported into private media storage. All images, strategy records, draft posts and the apply receipt commit together. Applying never creates publishing jobs or publishes content.

## Contracts

- Scheduling is deterministic and honors pillar weights (including zero), calendar weekdays and the brand timezone. Suggested hours are planning defaults, not measured performance predictions.
- The provider returns validated JSON with unique slot IDs, distinct captions, asset IDs and selection reasons. The server supplies authoritative brand and asset data; browser-supplied analysis is never used.
- AI selects among bounded eligible candidates using their descriptions. Content still requires human factual review; prompting and validation do not establish factual accuracy.
- Generation IDs are durable. Repeating an identical ready request returns its result. Running/failed/uncertain requests are not automatically charged again; retry requires a newly confirmed request ID.
- Apply receipts survive backend restarts. Concurrent or repeated applies return the original posts. A lost HTTP response can be retried without duplicating the batch. An edited repeat after a successful save still returns the original posts; edit saved posts through the normal editor.
- All references are validated against the selected brand. Edits recompute UTC from date, time and timezone, clear an explicitly removed asset, and reject mismatched pillar/angle pairs.
- Changes to brand context, source generation, file version or approved analysis fence work before commit. Imported original bytes pass the existing image validation and storage limits.
- Uploaded images count only when private image chunks exist. A URL-only record never qualifies. AI I/O waits share the existing request deadline even when a transport or stream ignores abort; uncertain requests are not replayed automatically. Safe diagnostics may identify `actor_request`, `provider_headers` or `provider_body` without exposing provider contents.

## Limits and release gates

- At most 60 slots (30 days, twice daily), 3 MiB per source image, and 32 MiB of distinct downloaded images per apply. The existing workspace storage cap also applies. Reduce the reviewed batch or image sizes when exceeded.
- Candidate descriptions are bounded; the model sees scheduled candidates plus up to 80 additional eligible images. This is not an exhaustive search across a large catalog.
- Source catalog rows have no public preview URL. Their filenames/descriptions are available in review; imported images become normal private media after saving.
- Unsaved browser edits are in memory. Keep the page open; changing brands resets the editor. Persistent plan retrieval and an editing history are not included.
- No live provider request or production deployment was performed during this fix. Real AI quality, latency, quota and provider-specific output limits still require acceptance with the owner's configured provider and at least 20 eligible assets.

## Verification (2026-11-01)

Regression tests in `server/ai-content-strategist.test.js` exercise the real provider adapter with deterministic outbound fixtures, source image import, transactional rollback, concurrent/repeated apply, consent, stale work, brand isolation, edit semantics, posting frequency and regeneration. Other server tests cover the existing Worker/R2/Queue runtime, authentication, publishing and licensing.

An isolated in-memory API and browser session created 30 fixture suggestions, changed the first to 21:15, removed its image, and saved all 30 to the calendar. The calendar displayed the edited 21:15 correctly. Desktop and 390px viewport inspection passed; mobile document width matched its available viewport without horizontal overflow. No production workspace data was created or modified.
