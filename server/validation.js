export const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

function validateMediaIds(ids, sameScope, store, errorMessage = 'Invalid per-Page settings') {
    if (!Array.isArray(ids) || ids.length > 10 || ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) fail(errorMessage);
    for (const id of ids) sameScope(store.get('MediaAsset', id));
}

function validateComments(comments, sameScope, store) {
    if (!Array.isArray(comments) || comments.length > 10) fail('Invalid comment chain');
    for (const item of comments) {
        if (!item || typeof item !== 'object' || Array.isArray(item) || Object.keys(item).some(key => !['id', 'message', 'media_ids', 'delay_minutes', 'actor_account_id'].includes(key))) fail('Invalid comment chain');
        if (item.id !== undefined && (typeof item.id !== 'string' || !item.id.trim() || item.id.length > 120)) fail('Invalid comment chain');
        if (item.message !== undefined && (typeof item.message !== 'string' || item.message.length > 63206)) fail('Invalid comment chain');
        if (item.media_ids !== undefined) {
            if (!Array.isArray(item.media_ids) || item.media_ids.length > 1 || item.media_ids.some(id => typeof id !== 'string' || !id.trim())) fail('Invalid comment chain');
            for (const id of item.media_ids) sameScope(store.get('MediaAsset', id));
        }
        if (!(item.message && item.message.trim()) && !(item.media_ids && item.media_ids.length)) fail('Each comment requires text or an image');
        if (item.delay_minutes !== undefined && (!Number.isInteger(item.delay_minutes) || item.delay_minutes < 0 || item.delay_minutes > 10080)) fail('Comment delay must be between 0 and 10080 minutes');
        if (item.actor_account_id !== undefined && item.actor_account_id !== '') {
            if (typeof item.actor_account_id !== 'string' || !item.actor_account_id.trim()) fail('Invalid comment chain');
            sameScope(store.get('SocialAccount', item.actor_account_id));
        }
    }
}

export function validateRecord(entity, record, previous, schema, store, verified = false, publisher = false) {
    for (const key of Object.keys(record)) {
        if (!schema.properties[key] && !['id', 'created_date', 'updated_date'].includes(key)) fail(`Unsupported field: ${key}`);
    }
    for (const key of schema.required || []) {
        if (typeof record[key] !== 'string' || !record[key].trim()) fail(`${key} is required`);
    }
    for (const [key, rule] of Object.entries(schema.properties)) {
        const value = record[key];
        if (value == null) continue;
        const type = Array.isArray(value) ? 'array' : typeof value;
        if (type !== rule.type) fail(`Invalid ${key}`);
        if (rule.enum && !rule.enum.includes(value)) fail(`Invalid ${key}`);
        if (rule.items && value.some((item) => typeof item !== rule.items.type)) fail(`Invalid ${key} items`);
        if (rule.format === 'date-time') {
            if (!Number.isFinite(Date.parse(value)) || !/(Z|[+-]\d\d:\d\d)$/.test(value)) fail(`Invalid UTC timestamp: ${key}`);
            record[key] = new Date(value).toISOString();
        }
    }
    if (entity === 'PostTemplate') {
        if (Object.keys(record).some(key => record[key] === null)) fail('Template fields cannot be null');
        record.name = record.name.trim();
        if (record.name.length > 160) fail('Template name must contain between 1 and 160 characters');
        if (store.get('Brand', record.brand_id).status === 'archived') fail('Choose an active brand', 409);
        for (const key of ['media_ids', 'account_ids']) {
            const ids = record[key] || [];
            if (ids.length > (key === 'media_ids' ? 10 : 30) || ids.some(id => !id.trim()) || new Set(ids).size !== ids.length) fail('Invalid template references');
        }
        const references = [
            ...[...(record.media_ids || []), ...Object.values(record.platform_media_ids || {}).filter(Array.isArray).flat()].map(id => ['MediaAsset', id]),
            ...(record.account_ids || []).map(id => ['SocialAccount', id]),
            ...(record.pillar_id ? [['ContentPillar', record.pillar_id]] : []),
            ...(record.angle_id ? [['ContentAngle', record.angle_id]] : []),
        ];
        for (const [parentEntity, id] of references) {
            const parent = store.get(parentEntity, id);
            if (parent.brand_id !== record.brand_id || parent.is_demo !== record.is_demo) fail('Cross-brand or demo/live association is not allowed');
        }
        if (record.caption && record.caption.length > 63206) fail('Invalid template caption');
        if (record.platform_captions && Object.keys(record.platform_captions).some(platform => !['facebook', 'instagram', 'threads', 'tiktok', 'linkedin'].includes(platform))) fail('Invalid platform captions');
    }
    if (record.timezone) {
        try { new Intl.DateTimeFormat('en', { timeZone: record.timezone }); } catch { fail('Invalid timezone'); }
    }
    if (record.color && !/^#[0-9a-f]{6}$/i.test(record.color)) fail('Invalid color');
    if (entity === 'ContentPillar' && (!Number.isFinite(record.target_percentage) || record.target_percentage < 0 || record.target_percentage > 100)) fail('Target percentage must be between 0 and 100');
    const sameScope = (parent) => {
        if (parent.is_demo !== record.is_demo || (record.brand_id && parent.brand_id && parent.brand_id !== record.brand_id)) fail('Cross-brand or demo/live association is not allowed');
        return parent;
    };
    if (record.brand_id) sameScope(store.get('Brand', record.brand_id));
    if (record.pillar_id) {
        const pillar = sameScope(store.get('ContentPillar', record.pillar_id));
        if (pillar.status === 'archived' && record.pillar_id !== previous?.pillar_id) fail('Choose an active pillar');
    }
    if (record.angle_id) {
        const angle = sameScope(store.get('ContentAngle', record.angle_id));
        if (angle.pillar_id !== record.pillar_id) fail('Angle must belong to the selected pillar');
        if (angle.status === 'archived' && record.angle_id !== previous?.angle_id) fail('Choose an active angle');
    }
    for (const id of record.account_ids || []) sameScope(store.get('SocialAccount', id));
    if (['Post', 'PostTemplate'].includes(entity) && record.platform_captions && Object.values(record.platform_captions).some(caption => typeof caption !== 'string' || caption.length > 63206)) fail('Invalid platform captions');
    if (['Post', 'PostTemplate'].includes(entity) && record.destination_settings) {
        for (const [id, settings] of Object.entries(record.destination_settings)) {
            if (!record.account_ids?.includes(id) || !settings || typeof settings !== 'object' || Array.isArray(settings) || Object.keys(settings).some(key => !(entity === 'PostTemplate' ? ['caption', 'media_ids', 'comments'] : ['caption', 'scheduled_at', 'tiktok', 'media_ids', 'comments']).includes(key))) fail('Invalid per-Page settings');
            if (settings.tiktok !== undefined && (store.get('SocialAccount', id).platform !== 'tiktok' || typeof settings.tiktok !== 'object' || !settings.tiktok || Array.isArray(settings.tiktok) || JSON.stringify(settings.tiktok).length > 2048)) fail('Invalid TikTok options');
            if (settings.caption !== undefined && (typeof settings.caption !== 'string' || !settings.caption.trim() || settings.caption.length > 63206)) fail('Facebook caption must contain between 1 and 63206 characters');
            if (settings.scheduled_at !== undefined && (typeof settings.scheduled_at !== 'string' || !Number.isFinite(Date.parse(settings.scheduled_at)) || !/(Z|[+-]\d\d:\d\d)$/.test(settings.scheduled_at))) fail('Invalid per-Page publishing time');
            if (settings.media_ids !== undefined) validateMediaIds(settings.media_ids, sameScope, store, 'Invalid per-Page settings');
            if (settings.comments !== undefined) validateComments(settings.comments, sameScope, store);
        }
    }
    if (['Post', 'PostTemplate'].includes(entity) && record.comments !== undefined) {
        validateComments(record.comments, sameScope, store);
    }
    if (['Post', 'PostTemplate'].includes(entity) && record.platform_media_ids !== undefined) {
        const overrides = record.platform_media_ids;
        if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) fail('Invalid platform media');
        for (const [platform, ids] of Object.entries(overrides)) {
            if (!['facebook', 'instagram', 'threads', 'tiktok', 'linkedin'].includes(platform) || !Array.isArray(ids) || ids.length > 10 || ids.some(id => typeof id !== 'string' || !id.trim()) || new Set(ids).size !== ids.length) fail('Invalid platform media');
            for (const id of ids) sameScope(store.get('MediaAsset', id));
        }
    }
    for (const id of record.media_ids || []) sameScope(store.get('MediaAsset', id));
    if (record.social_account_id) sameScope(store.get('SocialAccount', record.social_account_id));
    if (record.post_id) {
        const post = sameScope(store.get('Post', record.post_id));
        if (record.social_account_id && store.get('SocialAccount', record.social_account_id).brand_id !== post.brand_id) fail('Destination must belong to the post brand');
    }
    if (previous && (record.is_demo !== previous.is_demo || record.brand_id !== previous.brand_id)) {
        // Referenced parent records cannot be moved, which would corrupt descendants/history.
        if (store.references(entity, record.id)) fail('Referenced records cannot move between brands or workspaces', 409);
    }
    if (entity === 'SocialAccount' && !verified) {
        if (record.connection_provider !== previous?.connection_provider && record.connection_provider !== 'native' || record.credential_id !== previous?.credential_id || (record.credential_id && ['external_id', 'platform', 'account_type', 'connection_provider', 'scopes', 'connection_status', 'is_demo', ...(['instagram', 'threads', 'tiktok'].includes(record.platform) ? ['username'] : [])].some(key => JSON.stringify(record[key]) !== JSON.stringify(previous?.[key])))) fail('Facebook connection metadata is server-owned', 409);
        if (record.connection_status === 'connected' && !previous?.credential_id) fail('Meta OAuth is required; a manual account cannot be connected', 409);
    }
    if (entity === 'SocialAccount' && record.connection_status === 'demo' && !record.is_demo) fail('Demo destinations must stay in the demo workspace');
    if (['Post', 'PublishJob', 'PostVariant'].includes(entity) && ['published', 'partially_published', 'unknown'].includes(record.status) && !record.is_demo && !publisher) fail('Publishing requires confirmed platform results', 409);
    if (!record.is_demo && (record.external_post_id || record.published_at || record.published_url) && !publisher) fail('Platform confirmation cannot be entered manually', 409);
    if (entity === 'Post' && !record.brand_id) fail('Post brand is required');
    if (entity === 'Post' && record.status === 'scheduled' && (!record.scheduled_at || !record.account_ids?.length)) fail('Scheduled posts require a time and destinations');
    if (entity === 'Post' && previous && !record.is_demo && ['published', 'partially_published', 'processing', 'unknown'].includes(previous.status) && !publisher) fail('Execution history is locked; duplicate this post instead', 409);
}
