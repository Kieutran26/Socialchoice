# Deszy Analytics retest

Date:2026-10-14 Asia/Saigon. Owner reported Meta permission addition and Facebook reconnect, then authorized Analytics testing.

Verified real saved Deszy PAGE token with Meta debug_token: valid, correct configured app and Page target; pages_read_user_content now present alongside pages_read_engagement/pages_manage_posts/pages_show_list. Real Page id/name GET returned200. No token values printed or committed.

Current application metrics service checked four previously confirmed Socialchoice publications in bounded batches3+1, using an isolated in-memory SQLite copy of authorized cloud metadata/credential. All four remain unavailable: three text/photo/scheduled post IDs denied code10; video ID denied code100/subcode33. Direct check of the scheduled ID explicitly returned the pages_read_engagement/PPCA access error despite the verified token grant. This is not evidence that the newly added scope is absent or that these posts are deleted.

Control read through the same Meta adapter against an existing Page post previously returned by published_posts succeeded: reactions4, comments1, shares absent/unavailable. This confirms real counter retrieval now works for that accessible Page post. It was not imported into Socialchoice or added to its Analytics totals.

Remote SQL SELECT-only; Graph GET-only; snapshots isolated in memory. No production metrics snapshots saved, no posts published/edited/deleted, no login session decrypted or authentication bypass. Diagnostic outputs remain under the existing ignored live-* paths. Initial Cloudflare management read returned401 from expired OAuth; existing Wrangler whoami refreshed the authorized session, subsequent reads passed. No expanded Cloudflare scopes requested.

Result: permission/reconnect verified and accessible-post counter read succeeds; end-to-end Analytics for the four stored publication IDs still blocked by Meta object access. No inferred zero or inferred share count.

Unresolved: determine why Meta denies the stored publication IDs before claiming Socialchoice Analytics totals. A fresh publication test would require owner-approved exact content and publishing confirmation; it was not part of this read-only retest.
