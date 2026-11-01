import { fail } from './validation.js';
import { savePostPlan } from './post-plans.js';

const contentFields = ['title', 'brand_id', 'caption', 'platform_captions', 'media_ids', 'platform_media_ids', 'pillar_id', 'angle_id', 'account_ids', 'is_demo'];

// Capture only reusable content, never execution state or publishing consent.
export function saveTemplate(store, input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || typeof input.name !== 'string' || !input.name.trim() || input.name.trim().length > 160 || (input.id !== undefined && (typeof input.id !== 'string' || !input.id))) fail('Valid template name and content required');
    const data = input.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) fail('Template content required');
    const content = Object.fromEntries(contentFields.map(key => [key, key === 'is_demo' && data[key] === undefined ? false : data[key]]));
    if (Object.hasOwn(data, 'comments')) content.comments = data.comments;
    content.destination_settings = {};
    if (data.destination_settings !== undefined) {
        if (!data.destination_settings || typeof data.destination_settings !== 'object' || Array.isArray(data.destination_settings)) fail('Invalid per-Page settings');
        content.destination_settings = {};
        for (const [id, settings] of Object.entries(data.destination_settings)) {
            if (!settings || typeof settings !== 'object' || Array.isArray(settings)) fail('Invalid per-Page settings');
            const entry = {};
            if (Object.hasOwn(settings, 'caption')) entry.caption = settings.caption;
            if (Object.hasOwn(settings, 'media_ids')) entry.media_ids = settings.media_ids;
            if (Object.hasOwn(settings, 'comments')) entry.comments = settings.comments;
            if (Object.keys(entry).length > 0) content.destination_settings[id] = entry;
        }
    }
    return store.transaction(() => store.write('PostTemplate', { ...content, name: input.name.trim() }, input.id));
}

export function createTemplateDraft(store, id) {
    if (typeof id !== 'string' || !id) fail('Template ID required');
    return store.transaction(() => {
        const template = store.get('PostTemplate', id);
        const brand = store.get('Brand', template.brand_id);
        if (brand.status === 'archived') fail('Choose an active brand', 409);
        const content = Object.fromEntries([...contentFields, 'destination_settings', 'comments'].filter(key => Object.hasOwn(template, key)).map(key => [key, template[key]]));
        const warnings = [];
        if (content.pillar_id && store.get('ContentPillar', content.pillar_id).status === 'archived') {
            delete content.pillar_id;
            delete content.angle_id;
            warnings.push('Archived pillar and angle were cleared. Choose active content strategy.');
        } else if (content.angle_id && store.get('ContentAngle', content.angle_id).status === 'archived') {
            delete content.angle_id;
            warnings.push('Archived angle was cleared. Choose an active content angle.');
        }
        const post = savePostPlan(store, { data: { ...content, title: content.title || template.name, status: 'draft', timezone: brand.timezone || 'Asia/Ho_Chi_Minh' } });
        return { post, warnings };
    });
}
