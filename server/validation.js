export const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };

export function validateRecord(entity, record, previous, schema, store) {
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
    if (entity === 'SocialAccount' && record.connection_status === 'connected') fail('Meta OAuth is not configured; a manual account cannot be connected', 409);
    if (entity === 'SocialAccount' && record.connection_status === 'demo' && !record.is_demo) fail('Demo destinations must stay in the demo workspace');
    if (['Post', 'PublishJob'].includes(entity) && ['published', 'partially_published'].includes(record.status) && !record.is_demo) fail('Publishing requires confirmed platform results; unavailable in Phase A', 409);
    if (!record.is_demo && (record.external_post_id || record.published_at || record.published_url)) fail('Platform confirmation cannot be entered manually', 409);
    if (entity === 'Post' && !record.brand_id) fail('Post brand is required');
    if (entity === 'Post' && record.status === 'scheduled' && (!record.scheduled_at || !record.account_ids?.length)) fail('Scheduled posts require a time and destinations');
    if (entity === 'Post' && previous && !record.is_demo && ['published', 'partially_published', 'processing'].includes(previous.status)) fail('Execution history is locked; duplicate this post instead', 409);
}
