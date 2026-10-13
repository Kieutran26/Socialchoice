# Facebook performance analytics

Open Analytics → Facebook post performance. This section reads reactions, comments and shares for Facebook publications confirmed by Socialchoice. A single connected Page is enough. It does not publish, resend, comment, react or share anything on Facebook.

## Reading the numbers

Select publication dates, Page and Content Pillar. Dates use the workspace timezone and include the whole selected final day. Filters select when a publication happened; the numbers are the most recently available **lifetime** counts for those publications, not interactions occurring within that date range.

Summary cards and Page/Pillar comparison show the total returned counts and how many publications have that metric. A confirmed count of zero is shown as0. Missing, unsupported, denied or unsynced metrics are shown as an em dash, never invented zero. Each per-Page publication is counted separately; duplicate records of the same Facebook Page/post ID are excluded. Comparisons sum measured values only and show their coverage. Top publications sort by reactions, with unknown values after measured values.

The top table shows at most50 rows; aggregate cards/comparisons use up to1000 confirmed publications in the chosen range. At the1000 bound, a notice asks you to narrow dates; totals then describe only that bounded selection. Dates cannot span more than366 days. A missing metric does not contribute to totals. These are counts, not unique audience counts.

Each metric shows its last successful retrieval time; Last checked is the last refresh attempt. Failed refresh preserves the previous value/time and marks Previous data with an error. Values older than24hours are also marked Previous data. Reaction/comment/share counts are exactly the supported count summaries returned by Facebook; visibility/permissions may restrict what Meta returns.

Reach, views, impressions and engagement rates are not collected or estimated. The existing weekly production, delivery outcomes and content-mix analytics remain below the performance section and measure different things.

## Refresh

Click Refresh next3publications. Each click reads at most3 due publications, with independent count-only requests for each metric and an8second request timeout. No personal reaction/comment lists are requested. One unsupported metric does not block the other counts. Repeat while the UI shows publications ready to refresh. A publication has a one-minute cooldown; availability refreshes from local cache automatically after the cooldown without making a Facebook request.

The Page must be connected and grant pages_read_engagement in both account metadata and its encrypted credential. Reconnect through Social Accounts when required. Additional Page access/app permissions may affect particular fields; unsupported/denied fields remain unavailable. Credentials never reach the browser. Read-only synchronization leases persist for30seconds and avoid duplicate reads in concurrent tabs. Interrupted reads may be explicitly refreshed after the cooldown.

The sample workspace shows an explicit explanation instead of synthetic platform metrics. Only server-owned confirmed publication IDs are eligible; draft/demo/unknown deliveries, manually entered jobs and arbitrary remote post IDs cannot supply platform evidence. Published posts outside Socialchoice are not imported.

## Persistence and operations

Snapshots and read leases live in the private facebook_metrics table in the same local/Cloudflare SQLite workspace. They are unavailable through entity write APIs. No new storage provider, namespace, encryption key, paid service, external scheduler or automatic Graph poll is added. Preserve this table with normal workspace backups. Refreshing metrics cannot alter publishing status/history or scheduled jobs. The existing authenticated API/origin protections apply.

Status: implemented and locally tested. Parser/response fixtures test contract behavior and are not proof of live Meta retrieval. Browser tests use explicitly labeled, isolated in-memory synthetic publication/snapshot rows, with a disconnected Page causing real local preflight failure before Graph. No live metrics request or online rollout is claimed for this feature.

## API evidence

Meta's reference pages returned429 during this implementation. The primary [Meta SDK PagePost source](https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/pagepost.py) confirms shares and comments/reactions read surfaces. Reference locations: [PagePost](https://developers.facebook.com/docs/graph-api/reference/page-post/), [reactions](https://developers.facebook.com/docs/graph-api/reference/object/reactions/), [comments](https://developers.facebook.com/docs/graph-api/reference/object/comments/). The configured Graph version's actual response remains authoritative: runtime strictly validates identity/counts and shows unavailable fields instead of claiming support from documentation alone.
