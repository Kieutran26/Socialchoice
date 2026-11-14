import { savePostPlan } from './post-plans.js';
import { fail } from './validation.js';
import { DEFAULT_MCP_SCOPES, MCP_SCOPES, normalizeScopes } from './mcp-store.js';

export const MCP_PROTOCOL_VERSION = '2025-03-26';

export const MCP_TOOL_DEFINITIONS = [
    {
        name: 'list_brands',
        title: 'List Brands',
        kind: 'entity',
        entity: 'Brand',
        operation: 'read',
        requiredScope: 'posts:read',
        description:
            'List all brands in the SocialChoice workspace (including brand_id, name, timezone, tone_of_voice, target_audience, products, goals). Always call this first to find the right brand_id.',
        inputSchema: {
            type: 'object',
            properties: {
                include_archived: {
                    type: 'boolean',
                    description: 'Whether to include archived brands (default: false).',
                },
                include_demo: {
                    type: 'boolean',
                    description: 'Whether to include demo workspace brands (default: false).',
                },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'list_accounts',
        title: 'List Social Accounts',
        kind: 'entity',
        entity: 'SocialAccount',
        operation: 'read',
        requiredScope: 'posts:read',
        description:
            'List social media destination accounts (Facebook Pages, Instagram, Threads, TikTok, LinkedIn, X) in SocialChoice. Filter by brand_id or platform to get account_ids for scheduling or publishing.',
        inputSchema: {
            type: 'object',
            properties: {
                brand_id: {
                    type: 'string',
                    description: 'Optional brand_id to filter accounts belonging to a specific brand.',
                },
                platform: {
                    type: 'string',
                    enum: ['facebook', 'instagram', 'threads', 'linkedin', 'tiktok', 'youtube', 'x', 'reddit'],
                    description: 'Optional platform filter.',
                },
                include_demo: {
                    type: 'boolean',
                    description: 'Whether to include demo accounts (default: false).',
                },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'list_content_pillars',
        title: 'List Content Pillars & Angles',
        kind: 'entity',
        entity: 'ContentPillar',
        operation: 'read',
        requiredScope: 'posts:read',
        description:
            'List content pillars and content angles configured for a brand so generated posts align with the brand strategy.',
        inputSchema: {
            type: 'object',
            properties: {
                brand_id: {
                    type: 'string',
                    description: 'Optional brand_id to filter pillars and angles.',
                },
                include_demo: {
                    type: 'boolean',
                    description: 'Whether to include demo pillars/angles (default: false).',
                },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'list_scheduled_posts',
        title: 'List Scheduled & Draft Posts',
        kind: 'entity',
        entity: 'Post',
        operation: 'read',
        requiredScope: 'posts:read',
        description:
            'List posts on the SocialChoice calendar or draft queue. Filter by brand_id, status (draft, scheduled, published, failed, cancelled), or date range.',
        inputSchema: {
            type: 'object',
            properties: {
                brand_id: {
                    type: 'string',
                    description: 'Filter posts by brand_id.',
                },
                status: {
                    type: 'string',
                    enum: ['draft', 'scheduled', 'processing', 'published', 'partially_published', 'failed', 'cancelled'],
                    description: 'Filter posts by status.',
                },
                from_date: {
                    type: 'string',
                    description: 'Optional ISO date/timestamp lower bound for scheduled_at (e.g. 2026-11-01).',
                },
                to_date: {
                    type: 'string',
                    description: 'Optional ISO date/timestamp upper bound for scheduled_at (e.g. 2026-11-30).',
                },
                limit: {
                    type: 'number',
                    description: 'Maximum number of posts to return (default: 30, max: 100).',
                },
                include_demo: {
                    type: 'boolean',
                    description: 'Whether to include demo posts (default: false).',
                },
            },
            additionalProperties: false,
        },
    },
    {
        name: 'create_draft',
        title: 'Create Draft Post',
        kind: 'entity',
        entity: 'Post',
        operation: 'create',
        requiredScope: 'posts:write',
        description:
            'Create a new draft post in SocialChoice without scheduling it yet. Useful when brainstorming or preparing content for user review.',
        inputSchema: {
            type: 'object',
            properties: {
                brand_id: {
                    type: 'string',
                    description: 'The ID of the brand this post belongs to.',
                },
                title: {
                    type: 'string',
                    description: 'Internal title/topic of the post for the content calendar.',
                },
                caption: {
                    type: 'string',
                    description: 'Main post caption/copy.',
                },
                account_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Optional array of SocialAccount IDs to target.',
                },
                pillar_id: {
                    type: 'string',
                    description: 'Optional ContentPillar ID.',
                },
                angle_id: {
                    type: 'string',
                    description: 'Optional ContentAngle ID (must belong to pillar_id).',
                },
                platform_captions: {
                    type: 'object',
                    description: 'Optional per-platform caption overrides keyed by facebook, instagram, threads, tiktok, linkedin.',
                },
                notes: {
                    type: 'string',
                    description: 'Optional internal notes or creative brief.',
                },
            },
            required: ['brand_id', 'title', 'caption'],
            additionalProperties: false,
        },
    },
    {
        name: 'schedule_post',
        title: 'Schedule Post on Calendar',
        kind: 'action',
        requiredScope: 'posts:write',
        description:
            'Create and schedule a new post—or schedule an existing draft post—at a specific date and time on SocialChoice. Automatically queues live connected accounts for background publishing when eligible.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: {
                    type: 'string',
                    description: 'Optional existing draft post_id to schedule. Omit to create a new scheduled post.',
                },
                brand_id: {
                    type: 'string',
                    description: 'Brand ID (required when creating a new post).',
                },
                title: {
                    type: 'string',
                    description: 'Internal post title for the calendar (required when creating a new post).',
                },
                caption: {
                    type: 'string',
                    description: 'Post caption/content (required when creating a new post).',
                },
                account_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Destination SocialAccount IDs to publish to (at least 1 account required).',
                },
                scheduled_at: {
                    type: 'string',
                    description:
                        'Scheduled publish date and time in ISO 8601 format (e.g. "2026-11-20T09:00:00+07:00" or "2026-11-20T09:00:00"). If no timezone offset is included, the brand timezone is used.',
                },
                timezone: {
                    type: 'string',
                    description: 'IANA timezone name (e.g. "Asia/Ho_Chi_Minh"). Defaults to the brand timezone.',
                },
                pillar_id: {
                    type: 'string',
                    description: 'Optional ContentPillar ID.',
                },
                angle_id: {
                    type: 'string',
                    description: 'Optional ContentAngle ID.',
                },
                platform_captions: {
                    type: 'object',
                    description: 'Optional per-platform caption overrides.',
                },
                notes: {
                    type: 'string',
                    description: 'Optional internal notes.',
                },
            },
            required: ['scheduled_at'],
            additionalProperties: false,
        },
    },
    {
        name: 'update_post',
        title: 'Update Draft or Scheduled Post',
        kind: 'entity',
        entity: 'Post',
        operation: 'update',
        requiredScope: 'posts:write',
        description:
            'Update the title, caption, scheduled time, target accounts, or strategy pillar/angle of an existing draft or scheduled post.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: {
                    type: 'string',
                    description: 'ID of the post to update.',
                },
                title: {
                    type: 'string',
                    description: 'Updated title.',
                },
                caption: {
                    type: 'string',
                    description: 'Updated caption.',
                },
                scheduled_at: {
                    type: 'string',
                    description: 'Updated scheduled time (ISO 8601).',
                },
                timezone: {
                    type: 'string',
                    description: 'Updated IANA timezone.',
                },
                account_ids: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Updated destination SocialAccount IDs.',
                },
                pillar_id: {
                    type: 'string',
                    description: 'Updated ContentPillar ID.',
                },
                angle_id: {
                    type: 'string',
                    description: 'Updated ContentAngle ID.',
                },
                notes: {
                    type: 'string',
                    description: 'Updated notes.',
                },
            },
            required: ['post_id'],
            additionalProperties: false,
        },
    },
    {
        name: 'cancel_post',
        title: 'Cancel Scheduled Post',
        kind: 'action',
        requiredScope: 'posts:write',
        description:
            'Cancel an active scheduled post so it will not be published, optionally converting it back to a draft.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: {
                    type: 'string',
                    description: 'ID of the scheduled post to cancel.',
                },
                convert_to_draft: {
                    type: 'boolean',
                    description: 'If true, converts the post status back to "draft" instead of "cancelled" (default: false).',
                },
            },
            required: ['post_id'],
            additionalProperties: false,
        },
    },
    {
        name: 'publish_now',
        title: 'Publish Post Immediately',
        kind: 'action',
        requiredScope: 'posts:publish',
        description:
            'Immediately publish a post to its connected social media accounts. SAFETY REQUIREMENT: Call with confirm=false first to preview the exact caption and target accounts with the user, then call again with confirm=true only after the user explicitly confirms.',
        inputSchema: {
            type: 'object',
            properties: {
                post_id: {
                    type: 'string',
                    description: 'ID of the post to publish immediately.',
                },
                confirm: {
                    type: 'boolean',
                    description:
                        'Must be set to true ONLY after showing the preview to the user and receiving explicit user confirmation to publish right now.',
                },
            },
            required: ['post_id'],
            additionalProperties: false,
        },
    },
];

/**
 * Converts an ISO string (with or without timezone offset) into a canonical UTC ISO string.
 * When no offset is present (e.g. "2026-11-20T09:00:00" or "2026-11-20 09:00"), interprets
 * the local wall time in `timeZone` (defaulting to Asia/Ho_Chi_Minh).
 */
export function parseScheduledTimeToUtcIso(rawInput, timeZone = 'Asia/Ho_Chi_Minh') {
    if (!rawInput || typeof rawInput !== 'string') {
        fail('scheduled_at must be a valid ISO 8601 date-time string');
    }
    const trimmed = rawInput.trim();
    if (/(Z|[+-]\d\d:\d\d)$/.test(trimmed)) {
        const ms = Date.parse(trimmed);
        if (!Number.isFinite(ms)) fail(`Invalid scheduled_at timestamp: ${rawInput}`);
        return new Date(ms).toISOString();
    }

    const match =
        /^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    if (!match) {
        fail(
            `scheduled_at must be in ISO format (e.g. "2026-11-20T09:00:00+07:00" or "2026-11-20T09:00:00")`
        );
    }
    const [, y, m, d, hh, mm, ss = '00'] = match;
    const utcGuess = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));

    let tz = timeZone || 'Asia/Ho_Chi_Minh';
    try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
    } catch {
        tz = 'Asia/Ho_Chi_Minh';
    }

    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
    });
    const parts = Object.fromEntries(formatter.formatToParts(new Date(utcGuess)).map((p) => [p.type, p.value]));
    const zonedAsUtc = Date.UTC(
        Number(parts.year),
        Number(parts.month) - 1,
        Number(parts.day),
        Number(parts.hour),
        Number(parts.minute),
        Number(parts.second)
    );
    const offsetMs = zonedAsUtc - utcGuess;
    return new Date(utcGuess - offsetMs).toISOString();
}

export async function executeMcpTool(name, args = {}, { store, publisher, scopes = DEFAULT_MCP_SCOPES }) {
    const tool = MCP_TOOL_DEFINITIONS.find((t) => t.name === name);
    if (!tool) fail(`Unknown MCP tool: ${name}`, 404);

    if (!scopes.includes(tool.requiredScope)) {
        fail(
            `Permission denied: Tool "${name}" requires scope "${tool.requiredScope}", which was not granted to this connection.`,
            403
        );
    }

    switch (name) {
        case 'list_brands': {
            const includeArchived = !!args.include_archived;
            const includeDemo = !!args.include_demo;
            const brands = store
                .all('Brand')
                .filter((b) => (includeDemo ? true : !b.is_demo))
                .filter((b) => (includeArchived ? true : b.status !== 'archived'))
                .map((b) => ({
                    id: b.id,
                    name: b.name,
                    description: b.description || '',
                    timezone: b.timezone || 'Asia/Ho_Chi_Minh',
                    status: b.status,
                    tone_of_voice: b.tone_of_voice || '',
                    target_audience: b.target_audience || '',
                    products: b.products || '',
                    goals: b.goals || '',
                    posting_frequency: b.posting_frequency || '',
                    is_demo: !!b.is_demo,
                }));
            return { brands, count: brands.length };
        }

        case 'list_accounts': {
            const includeDemo = !!args.include_demo;
            const accounts = store
                .all('SocialAccount')
                .filter((a) => (includeDemo ? true : !a.is_demo))
                .filter((a) => (args.brand_id ? a.brand_id === args.brand_id : true))
                .filter((a) => (args.platform ? a.platform === args.platform : true))
                .map((a) => ({
                    id: a.id,
                    brand_id: a.brand_id,
                    platform: a.platform,
                    account_type: a.account_type,
                    name: a.name,
                    username: a.username || '',
                    connection_status: a.connection_status,
                    is_demo: !!a.is_demo,
                }));
            return { accounts, count: accounts.length };
        }

        case 'list_content_pillars': {
            const includeDemo = !!args.include_demo;
            const pillars = store
                .all('ContentPillar')
                .filter((p) => (includeDemo ? true : !p.is_demo))
                .filter((p) => p.status !== 'archived')
                .filter((p) => (args.brand_id ? p.brand_id === args.brand_id : true));
            const angles = store
                .all('ContentAngle')
                .filter((a) => (includeDemo ? true : !a.is_demo))
                .filter((a) => a.status !== 'archived')
                .filter((a) => (args.brand_id ? a.brand_id === args.brand_id : true));
            return {
                pillars: pillars.map((p) => ({
                    id: p.id,
                    brand_id: p.brand_id,
                    name: p.name,
                    description: p.description || '',
                    target_percentage: p.target_percentage,
                    angles: angles
                        .filter((a) => a.pillar_id === p.id)
                        .map((a) => ({
                            id: a.id,
                            name: a.name,
                            description: a.description || '',
                        })),
                })),
                count: pillars.length,
            };
        }

        case 'list_scheduled_posts': {
            const includeDemo = !!args.include_demo;
            const limit = Math.min(Math.max(Number(args.limit) || 30, 1), 100);
            const fromMs = args.from_date ? Date.parse(args.from_date) : null;
            const toMs = args.to_date ? Date.parse(args.to_date) : null;
            const accountsById = new Map(store.all('SocialAccount').map((a) => [a.id, a]));
            const brandsById = new Map(store.all('Brand').map((b) => [b.id, b]));

            const posts = store
                .all('Post')
                .filter((p) => (includeDemo ? true : !p.is_demo))
                .filter((p) => (args.brand_id ? p.brand_id === args.brand_id : true))
                .filter((p) => (args.status ? p.status === args.status : true))
                .filter((p) => {
                    if (!fromMs && !toMs) return true;
                    const t = p.scheduled_at ? Date.parse(p.scheduled_at) : null;
                    if (!t) return false;
                    if (fromMs && t < fromMs) return false;
                    if (toMs && t > toMs) return false;
                    return true;
                })
                .sort((a, b) =>
                    String(a.scheduled_at || a.created_date || '').localeCompare(
                        String(b.scheduled_at || b.created_date || '')
                    )
                )
                .slice(0, limit)
                .map((p) => ({
                    id: p.id,
                    brand_id: p.brand_id,
                    brand_name: brandsById.get(p.brand_id)?.name || '',
                    title: p.title,
                    caption: p.caption || '',
                    status: p.status,
                    scheduled_at: p.scheduled_at || null,
                    timezone: p.timezone || 'Asia/Ho_Chi_Minh',
                    account_ids: p.account_ids || [],
                    accounts: (p.account_ids || []).map((id) => {
                        const acc = accountsById.get(id);
                        return acc ? { id: acc.id, name: acc.name, platform: acc.platform } : { id };
                    }),
                    pillar_id: p.pillar_id || null,
                    angle_id: p.angle_id || null,
                    updated_date: p.updated_date,
                }));

            return { posts, count: posts.length };
        }

        case 'create_draft': {
            const brand = store.get('Brand', args.brand_id);
            const payload = {
                brand_id: brand.id,
                title: String(args.title || '').trim(),
                caption: String(args.caption || '').trim(),
                status: 'draft',
                timezone: brand.timezone || 'Asia/Ho_Chi_Minh',
                account_ids: Array.isArray(args.account_ids) ? args.account_ids : [],
                media_ids: [],
                is_demo: !!brand.is_demo,
                ...(args.pillar_id ? { pillar_id: args.pillar_id } : {}),
                ...(args.angle_id ? { angle_id: args.angle_id } : {}),
                ...(args.platform_captions ? { platform_captions: args.platform_captions } : {}),
                ...(args.notes ? { notes: String(args.notes) } : {}),
            };
            const post = savePostPlan(store, { data: payload });
            return {
                message: 'Draft post created in SocialChoice.',
                post: {
                    id: post.id,
                    brand_id: post.brand_id,
                    title: post.title,
                    caption: post.caption,
                    status: post.status,
                    account_ids: post.account_ids || [],
                    created_date: post.created_date,
                },
            };
        }

        case 'schedule_post': {
            const existing = args.post_id ? store.get('Post', args.post_id) : null;
            const brandId = args.brand_id || existing?.brand_id;
            if (!brandId) fail('brand_id is required when creating a new scheduled post');
            const brand = store.get('Brand', brandId);
            const timezone = args.timezone || existing?.timezone || brand.timezone || 'Asia/Ho_Chi_Minh';
            const scheduledAtIso = parseScheduledTimeToUtcIso(args.scheduled_at, timezone);

            const accountIds = Array.isArray(args.account_ids)
                ? args.account_ids
                : existing?.account_ids || [];
            if (!accountIds.length) {
                fail(
                    'At least one destination account_id is required to schedule a post. Call list_accounts first to get valid account_ids.'
                );
            }

            const title = String(args.title ?? existing?.title ?? '').trim();
            const caption = String(args.caption ?? existing?.caption ?? '').trim();
            if (!title) fail('title is required');
            if (!caption) fail('caption is required');

            // If existing post already has an active automatic schedule, cancel it before re-scheduling
            const activeAttempt = existing ? store.attemptForPost(existing.id) : null;
            if (activeAttempt?.status === 'queued' && publisher) {
                publisher.cancelSchedule(existing.id);
            }

            const payload = {
                brand_id: brand.id,
                title,
                caption,
                status: 'scheduled',
                scheduled_at: scheduledAtIso,
                timezone,
                account_ids: accountIds,
                media_ids: existing?.media_ids || [],
                is_demo: !!brand.is_demo,
                ...(args.pillar_id || existing?.pillar_id
                    ? { pillar_id: args.pillar_id || existing?.pillar_id }
                    : {}),
                ...(args.angle_id || existing?.angle_id
                    ? { angle_id: args.angle_id || existing?.angle_id }
                    : {}),
                ...(args.platform_captions || existing?.platform_captions
                    ? { platform_captions: args.platform_captions || existing?.platform_captions }
                    : {}),
                ...(args.notes !== undefined
                    ? { notes: String(args.notes) }
                    : existing?.notes
                    ? { notes: existing.notes }
                    : {}),
            };

            const post = savePostPlan(store, { id: existing?.id, data: payload });

            // Try arming live automatic publishing if accounts are connected and publisher is available
            let liveSchedule = { armed: false, mode: 'calendar_plan', note: 'Saved to SocialChoice content calendar.' };
            if (publisher && !post.is_demo) {
                try {
                    const prep = publisher.prepareSchedule(post.id, scheduledAtIso, timezone);
                    const confirmed = publisher.schedule(prep.attemptId);
                    liveSchedule = {
                        armed: true,
                        mode: 'automatic_publishing',
                        scheduled_at: confirmed.scheduledAt,
                        destinations: confirmed.destinations,
                        note: 'Scheduled and armed for automatic background publishing.',
                    };
                } catch (err) {
                    liveSchedule = {
                        armed: false,
                        mode: 'calendar_plan',
                        note: `Saved on the SocialChoice calendar (${err.message}).`,
                    };
                }
            }

            return {
                message: liveSchedule.note,
                post: {
                    id: post.id,
                    brand_id: post.brand_id,
                    title: post.title,
                    caption: post.caption,
                    status: post.status,
                    scheduled_at: post.scheduled_at,
                    timezone: post.timezone,
                    account_ids: post.account_ids,
                },
                live_publishing: liveSchedule,
            };
        }

        case 'update_post': {
            const existing = store.get('Post', args.post_id);
            const brand = store.get('Brand', existing.brand_id);
            const activeAttempt = store.attemptForPost(existing.id);
            if (activeAttempt?.status === 'queued' && publisher) {
                publisher.cancelSchedule(existing.id);
            }

            const timezone = args.timezone || existing.timezone || brand.timezone || 'Asia/Ho_Chi_Minh';
            const scheduledAtIso = args.scheduled_at
                ? parseScheduledTimeToUtcIso(args.scheduled_at, timezone)
                : existing.scheduled_at;

            const nextAccountIds = Array.isArray(args.account_ids) ? args.account_ids : existing.account_ids || [];
            const nextStatus =
                scheduledAtIso && nextAccountIds.length && existing.status === 'scheduled'
                    ? 'scheduled'
                    : args.scheduled_at && nextAccountIds.length
                    ? 'scheduled'
                    : existing.status;

            const payload = {
                ...existing,
                title: args.title !== undefined ? String(args.title).trim() : existing.title,
                caption: args.caption !== undefined ? String(args.caption).trim() : existing.caption,
                timezone,
                account_ids: nextAccountIds,
                status: nextStatus,
                ...(scheduledAtIso ? { scheduled_at: scheduledAtIso } : {}),
                ...(args.pillar_id !== undefined ? { pillar_id: args.pillar_id } : {}),
                ...(args.angle_id !== undefined ? { angle_id: args.angle_id } : {}),
                ...(args.notes !== undefined ? { notes: String(args.notes) } : {}),
            };
            delete payload.id;
            delete payload.created_date;
            delete payload.updated_date;

            const updated = savePostPlan(store, { id: existing.id, data: payload });
            return {
                message: 'Post updated successfully.',
                post: {
                    id: updated.id,
                    brand_id: updated.brand_id,
                    title: updated.title,
                    caption: updated.caption,
                    status: updated.status,
                    scheduled_at: updated.scheduled_at || null,
                    timezone: updated.timezone,
                    account_ids: updated.account_ids || [],
                },
            };
        }

        case 'cancel_post': {
            const existing = store.get('Post', args.post_id);
            const activeAttempt = store.attemptForPost(existing.id);
            if (activeAttempt?.status === 'queued' && publisher) {
                publisher.cancelSchedule(existing.id);
            }
            const nextStatus = args.convert_to_draft ? 'draft' : 'cancelled';
            const payload = {
                ...existing,
                status: nextStatus,
            };
            delete payload.id;
            delete payload.created_date;
            delete payload.updated_date;
            if (nextStatus === 'draft') {
                delete payload.scheduled_at;
            }
            const updated = savePostPlan(store, { id: existing.id, data: payload });
            return {
                message:
                    nextStatus === 'draft'
                        ? 'Scheduled post cancelled and moved back to drafts.'
                        : 'Scheduled post cancelled.',
                post: {
                    id: updated.id,
                    title: updated.title,
                    status: updated.status,
                },
            };
        }

        case 'publish_now': {
            const post = store.get('Post', args.post_id);
            const brand = store.get('Brand', post.brand_id);
            const accounts = (post.account_ids || []).map((id) => store.get('SocialAccount', id));

            if (args.confirm !== true) {
                return {
                    confirmation_required: true,
                    message:
                        'CONFIRMATION REQUIRED: Show this preview to the user and ask them to confirm before calling publish_now with confirm=true.',
                    preview: {
                        post_id: post.id,
                        brand: brand.name,
                        title: post.title,
                        caption: post.caption || '',
                        destinations: accounts.map((a) => ({
                            id: a.id,
                            name: a.name,
                            platform: a.platform,
                            connection_status: a.connection_status,
                        })),
                    },
                };
            }

            if (!publisher) {
                fail('Live publishing engine is not available in this environment.', 503);
            }
            const review = publisher.prepare(post.id);
            const result = await publisher.publish(review.attemptId);
            return {
                confirmation_required: false,
                message: 'Post published immediately via SocialChoice publishing engine.',
                result,
            };
        }

        default:
            fail(`Unsupported tool: ${name}`, 400);
    }
}

export function getPublicBaseOrigin(req, configuredOrigin) {
    if (configuredOrigin) return configuredOrigin.replace(/\/+$/, '');
    const proto =
        req.headers['x-forwarded-proto']?.split(',')[0]?.trim() ||
        (req.socket?.encrypted ? 'https' : 'http');
    const host =
        req.headers['x-forwarded-host']?.split(',')[0]?.trim() ||
        req.headers.host ||
        'localhost:3001';
    return `${proto}://${host}`;
}

export function setMcpCorsHeaders(req, res) {
    const origin = req.headers.origin || '*';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, Accept, MCP-Protocol-Version, Mcp-Session-Id'
    );
    res.setHeader('Access-Control-Expose-Headers', 'WWW-Authenticate, Mcp-Session-Id');
}

function sendJson(res, status, payload, extraHeaders = {}) {
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        ...extraHeaders,
    });
    res.end(JSON.stringify(payload));
}

async function parseRequestBody(req, readBody) {
    const raw = await readBody(req);
    if (!raw || !raw.trim()) return {};
    const contentType = (req.headers['content-type'] || '').split(';')[0].trim().toLowerCase();
    if (contentType === 'application/x-www-form-urlencoded') {
        return Object.fromEntries(new URLSearchParams(raw));
    }
    try {
        return JSON.parse(raw);
    } catch {
        // Fallback if client sent form-encoded without strict header
        if (raw.includes('=')) {
            return Object.fromEntries(new URLSearchParams(raw));
        }
        fail('Invalid JSON body', 400);
    }
}

export async function handleMcpAndOAuthRoutes({
    req,
    res,
    url,
    store,
    auth,
    publisher,
    publicOrigin,
    allowedOrigins = [],
    readBody,
    workspaceId = 'admin',
}) {
    const pathname = url.pathname;
    const checkSameOriginSession = () => {
        if (
            req.headers.origin &&
            allowedOrigins.length &&
            !allowedOrigins.includes(req.headers.origin)
        ) {
            fail('Origin not allowed', 403);
        }
        if (req.headers['sec-fetch-site'] === 'cross-site') {
            fail('Cross-site request denied', 403);
        }
    };

    // 1. OAuth 2.0 Protected Resource Metadata (RFC 9728)
    if (pathname === '/.well-known/oauth-protected-resource' || pathname === '/.well-known/oauth-protected-resource/mcp') {
        setMcpCorsHeaders(req, res);
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return true;
        }
        const base = getPublicBaseOrigin(req, publicOrigin);
        sendJson(res, 200, {
            resource: `${base}/mcp`,
            authorization_servers: [base],
            scopes_supported: MCP_SCOPES,
            bearer_methods_supported: ['header'],
            resource_documentation: `${base}/settings?tab=ai`,
        });
        return true;
    }

    // 2. OAuth 2.1 Authorization Server Metadata (RFC 8414)
    if (
        pathname === '/.well-known/oauth-authorization-server' ||
        pathname === '/.well-known/openid-configuration'
    ) {
        setMcpCorsHeaders(req, res);
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return true;
        }
        const base = getPublicBaseOrigin(req, publicOrigin);
        sendJson(res, 200, {
            issuer: base,
            authorization_endpoint: `${base}/api/mcp/authorize`,
            token_endpoint: `${base}/api/mcp/token`,
            registration_endpoint: `${base}/api/mcp/register`,
            revocation_endpoint: `${base}/api/mcp/revoke`,
            scopes_supported: MCP_SCOPES,
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
            code_challenge_methods_supported: ['S256', 'plain'],
            service_documentation: `${base}/settings?tab=ai`,
        });
        return true;
    }

    // 3. Dynamic Client Registration (RFC 7591) - Public endpoint for Claude / ChatGPT
    if (pathname === '/api/mcp/register') {
        setMcpCorsHeaders(req, res);
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return true;
        }
        if (req.method !== 'POST') fail('Method not allowed', 405);
        const body = await parseRequestBody(req, readBody);
        const registered = store.mcp.registerClient(body);
        sendJson(res, 201, registered);
        return true;
    }

    // 4. OAuth 2.1 Authorization Endpoint (Browser redirect from Claude / ChatGPT)
    if (pathname === '/api/mcp/authorize' && req.method === 'GET') {
        const clientId = url.searchParams.get('client_id') || 'ai_assistant';
        const redirectUri = url.searchParams.get('redirect_uri') || '';
        const scope = url.searchParams.get('scope') || DEFAULT_MCP_SCOPES.join(' ');
        const state = url.searchParams.get('state') || '';
        const codeChallenge = url.searchParams.get('code_challenge') || '';
        const codeChallengeMethod = url.searchParams.get('code_challenge_method') || 'S256';
        const resource = url.searchParams.get('resource') || '';
        const clientName = url.searchParams.get('client_name') || '';

        const authReq = store.mcp.createAuthRequest({
            client_id: clientId,
            client_name: clientName,
            redirect_uri: redirectUri,
            scope,
            state,
            code_challenge: codeChallenge,
            code_challenge_method: codeChallengeMethod,
            resource,
            workspace_id: workspaceId,
        });

        const base = getPublicBaseOrigin(req, publicOrigin);
        res.writeHead(302, {
            Location: `${base}/oauth/consent?ctx=${encodeURIComponent(authReq.handle)}`,
            'Cache-Control': 'no-store',
        });
        res.end();
        return true;
    }

    // 5. Consent Display Info (Called by src/pages/OAuthConsent.jsx)
    if (
        (pathname === '/api/mcp/consent-info' ||
            /^\/api\/apps\/[^/]+\/mcp\/consent-info$/.test(pathname)) &&
        req.method === 'GET'
    ) {
        checkSameOriginSession();
        const handle = url.searchParams.get('handle') || url.searchParams.get('ctx') || '';
        const authReq = store.mcp.getAuthRequest(handle);
        if (!authReq) {
            fail('This authorization link is invalid or has expired.', 404);
        }
        let authenticated = true;
        try {
            auth.require(req);
        } catch {
            authenticated = false;
        }
        sendJson(res, 200, {
            authenticated,
            login_path: '/login',
            app_name: 'SocialChoice',
            client_id: authReq.client_id,
            client_name: authReq.client_name,
            requested_scopes: authReq.requested_scopes,
            available_scopes: [
                {
                    scope: 'posts:read',
                    title: 'Xem thương hiệu, kênh và lịch bài đăng',
                    description:
                        'Đọc danh sách thương hiệu, tài khoản mạng xã hội, trụ cột nội dung và lịch bài viết.',
                    required: true,
                },
                {
                    scope: 'posts:write',
                    title: 'Tạo bản nháp và lên lịch bài đăng',
                    description:
                        'Tạo bài nháp mới, đặt lịch đăng bài trên lịch SocialChoice, chỉnh sửa hoặc hủy lịch.',
                    required: false,
                },
                {
                    scope: 'posts:publish',
                    title: 'Đăng bài trực tiếp ngay lập tức (có bước xác nhận)',
                    description:
                        'Cho phép AI xuất bản bài đăng ngay lập tức lên các kênh đã kết nối sau khi bạn xác nhận nội dung.',
                    required: false,
                },
            ],
            tools: MCP_TOOL_DEFINITIONS.map((t) => ({
                name: t.name,
                title: t.title,
                kind: t.kind,
                entity: t.entity,
                operation: t.operation,
                requiredScope: t.requiredScope,
                description: t.description,
            })),
        });
        return true;
    }

    // 6. Consent Approve / Deny Decision (Called by src/pages/OAuthConsent.jsx)
    if (
        (pathname === '/api/mcp/authorize-grant' ||
            /^\/api\/apps\/[^/]+\/mcp\/authorize-grant$/.test(pathname)) &&
        req.method === 'POST'
    ) {
        checkSameOriginSession();
        auth.require(req);
        const body = await parseRequestBody(req, readBody);
        const handle = body.ctx || body.handle || '';
        const action = body.action === 'approve' ? 'approve' : 'deny';
        const scopes = Array.isArray(body.scopes) ? body.scopes : undefined;

        const decision = store.mcp.consumeAuthRequestDecision(handle, {
            action,
            scopes,
            workspace_id: workspaceId,
        });
        sendJson(res, 200, decision);
        return true;
    }

    // 7. OAuth 2.1 Token Endpoint (Public endpoint for code exchange & refresh)
    if (pathname === '/api/mcp/token') {
        setMcpCorsHeaders(req, res);
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return true;
        }
        if (req.method !== 'POST') fail('Method not allowed', 405);
        try {
            const body = await parseRequestBody(req, readBody);
            const grantType = body.grant_type;
            if (grantType === 'authorization_code') {
                const tokenResponse = store.mcp.exchangeAuthorizationCode({
                    code: body.code,
                    client_id: body.client_id,
                    redirect_uri: body.redirect_uri,
                    code_verifier: body.code_verifier,
                });
                sendJson(res, 200, {
                    access_token: tokenResponse.access_token,
                    token_type: tokenResponse.token_type,
                    expires_in: tokenResponse.expires_in,
                    refresh_token: tokenResponse.refresh_token,
                    scope: tokenResponse.scope,
                });
                return true;
            }
            if (grantType === 'refresh_token') {
                const tokenResponse = store.mcp.exchangeRefreshToken({
                    refresh_token: body.refresh_token,
                    client_id: body.client_id,
                    scope: body.scope,
                });
                sendJson(res, 200, {
                    access_token: tokenResponse.access_token,
                    token_type: tokenResponse.token_type,
                    expires_in: tokenResponse.expires_in,
                    refresh_token: tokenResponse.refresh_token,
                    scope: tokenResponse.scope,
                });
                return true;
            }
            sendJson(res, 400, {
                error: 'unsupported_grant_type',
                error_description: 'Only authorization_code and refresh_token are supported.',
            });
            return true;
        } catch (err) {
            sendJson(res, err.status || 400, {
                error: 'invalid_grant',
                error_description: err.message || 'Token exchange failed.',
            });
            return true;
        }
    }

    // 8. Settings UI Management Endpoints (List connections, create personal token, revoke grant)
    if (pathname === '/api/mcp/connections' && req.method === 'GET') {
        checkSameOriginSession();
        auth.require(req);
        const base = getPublicBaseOrigin(req, publicOrigin);
        sendJson(res, 200, {
            mcp_url: `${base}/mcp`,
            oauth_Metadata_url: `${base}/.well-known/oauth-authorization-server`,
            grants: store.mcp.listGrants(),
            tools: MCP_TOOL_DEFINITIONS.map((t) => ({
                name: t.name,
                title: t.title,
                requiredScope: t.requiredScope,
                description: t.description,
            })),
        });
        return true;
    }

    if (pathname === '/api/mcp/tokens' && req.method === 'POST') {
        checkSameOriginSession();
        auth.require(req);
        const body = await parseRequestBody(req, readBody);
        const clientName =
            typeof body.name === 'string' && body.name.trim()
                ? body.name.trim().slice(0, 80)
                : 'ChatGPT / Claude Token';
        const scopes = normalizeScopes(body.scopes, DEFAULT_MCP_SCOPES);
        const issued = store.mcp.issueGrant({
            client_id: 'manual_connector',
            client_name: clientName,
            scopes,
            workspace_id: workspaceId,
            kind: 'personal_token',
            ttlSeconds: 365 * 24 * 60 * 60, // 1 year
        });
        const base = getPublicBaseOrigin(req, publicOrigin);
        sendJson(res, 201, {
            grant: issued.grant,
            access_token: issued.access_token,
            connector_url_with_token: `${base}/mcp?token=${encodeURIComponent(issued.access_token)}`,
        });
        return true;
    }

    if (pathname === '/api/mcp/revoke' && req.method === 'POST') {
        checkSameOriginSession();
        auth.require(req);
        const body = await parseRequestBody(req, readBody);
        const result = store.mcp.revokeGrant(body.id || body.grant_id);
        sendJson(res, 200, result);
        return true;
    }

    // 9. Streamable HTTP MCP Endpoint (/mcp)
    if (pathname === '/mcp') {
        setMcpCorsHeaders(req, res);
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            res.end();
            return true;
        }

        const base = getPublicBaseOrigin(req, publicOrigin);
        const rawBearer =
            req.headers.authorization ||
            (url.searchParams.get('token') ? `Bearer ${url.searchParams.get('token')}` : '');
        const grant = store.mcp.verifyAccessToken(rawBearer);

        if (!grant) {
            const wwwAuth = `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource", scope="${DEFAULT_MCP_SCOPES.join(' ')}"`;
            sendJson(
                res,
                401,
                {
                    jsonrpc: '2.0',
                    error: {
                        code: -32001,
                        message: 'Unauthorized: Valid OAuth 2.1 Bearer token required.',
                    },
                    id: null,
                },
                { 'WWW-Authenticate': wwwAuth }
            );
            return true;
        }

        if (req.method === 'DELETE') {
            res.writeHead(204);
            res.end();
            return true;
        }

        if (req.method === 'GET') {
            sendJson(res, 200, {
                name: 'socialchoice-mcp',
                version: '1.0.0',
                protocolVersion: MCP_PROTOCOL_VERSION,
                status: 'ok',
                client: grant.client_name,
                scopes: grant.scopes,
            });
            return true;
        }

        if (req.method !== 'POST') {
            fail('Method not allowed', 405);
        }

        const rpcPayload = await parseRequestBody(req, readBody);
        const handleSingleRpc = async (msg) => {
            if (!msg || typeof msg !== 'object') {
                return {
                    jsonrpc: '2.0',
                    id: null,
                    error: { code: -32600, message: 'Invalid Request' },
                };
            }
            const { id, method, params = {} } = msg;

            // Notifications (no id) do not return a response object
            if (id === undefined) {
                return null;
            }

            try {
                switch (method) {
                    case 'initialize':
                        return {
                            jsonrpc: '2.0',
                            id,
                            result: {
                                protocolVersion:
                                    params?.protocolVersion &&
                                    ['2024-11-05', '2025-03-26', '2025-06-18'].includes(
                                        params.protocolVersion
                                    )
                                        ? params.protocolVersion
                                        : MCP_PROTOCOL_VERSION,
                                capabilities: {
                                    tools: { listChanged: false },
                                },
                                serverInfo: {
                                    name: 'SocialChoice MCP Connector',
                                    version: '1.0.0',
                                },
                                instructions:
                                    'SocialChoice MCP Server. Use list_brands and list_accounts first to identify brand_id and account_ids. Use create_draft or schedule_post to plan content on the SocialChoice calendar. Always ask the user for confirmation before calling publish_now with confirm=true.',
                            },
                        };

                    case 'ping':
                        return { jsonrpc: '2.0', id, result: {} };

                    case 'resources/list':
                        return { jsonrpc: '2.0', id, result: { resources: [] } };

                    case 'prompts/list':
                        return { jsonrpc: '2.0', id, result: { prompts: [] } };

                    case 'tools/list': {
                        const visibleTools = MCP_TOOL_DEFINITIONS.filter((t) =>
                            grant.scopes.includes(t.requiredScope)
                        ).map((t) => ({
                            name: t.name,
                            description: t.description,
                            inputSchema: t.inputSchema,
                            annotations: {
                                title: t.title,
                                readOnlyHint: t.requiredScope === 'posts:read',
                                destructiveHint:
                                    t.name === 'cancel_post' || t.name === 'publish_now',
                                idempotentHint: t.requiredScope === 'posts:read',
                                openWorldHint: t.name === 'publish_now',
                            },
                        }));
                        return {
                            jsonrpc: '2.0',
                            id,
                            result: { tools: visibleTools },
                        };
                    }

                    case 'tools/call': {
                        const toolName = params?.name;
                        const toolArgs = params?.arguments || {};
                        try {
                            const output = await executeMcpTool(toolName, toolArgs, {
                                store,
                                publisher,
                                scopes: grant.scopes,
                            });
                            return {
                                jsonrpc: '2.0',
                                id,
                                result: {
                                    content: [
                                        {
                                            type: 'text',
                                            text: JSON.stringify(output, null, 2),
                                        },
                                    ],
                                    structuredContent: output,
                                    isError: false,
                                },
                            };
                        } catch (toolErr) {
                            return {
                                jsonrpc: '2.0',
                                id,
                                result: {
                                    content: [
                                        {
                                            type: 'text',
                                            text: JSON.stringify(
                                                {
                                                    error: true,
                                                    message:
                                                        toolErr.message ||
                                                        'Tool execution failed',
                                                },
                                                null,
                                                2
                                            ),
                                        },
                                    ],
                                    isError: true,
                                },
                            };
                        }
                    }

                    default:
                        return {
                            jsonrpc: '2.0',
                            id,
                            error: {
                                code: -32601,
                                message: `Method not found: ${method}`,
                            },
                        };
                }
            } catch (err) {
                return {
                    jsonrpc: '2.0',
                    id,
                    error: {
                        code: -32603,
                        message: err.message || 'Internal JSON-RPC error',
                    },
                };
            }
        };

        if (Array.isArray(rpcPayload)) {
            const responses = (await Promise.all(rpcPayload.map(handleSingleRpc))).filter(Boolean);
            if (!responses.length) {
                res.writeHead(202);
                res.end();
                return true;
            }
            sendJson(res, 200, responses);
            return true;
        }

        const singleResponse = await handleSingleRpc(rpcPayload);
        if (!singleResponse) {
            res.writeHead(202);
            res.end();
            return true;
        }
        sendJson(res, 200, singleResponse);
        return true;
    }

    return false;
}
