function serializeCommentItem(item = {}) {
    const mediaIds = Array.isArray(item.media) ? item.media.map(asset => asset.id) : Array.isArray(item.media_ids) ? [...item.media_ids] : [];
    const delayMinutes = Number.isInteger(item.delay_minutes) ? item.delay_minutes : 0;
    return {
        ...(item.id ? { id: item.id } : {}),
        message: item.message || '',
        ...(mediaIds.length ? { media_ids: mediaIds } : {}),
        ...(delayMinutes > 0 ? { delay_minutes: delayMinutes } : {}),
        ...(item.actor_account_id ? { actor_account_id: item.actor_account_id } : {}),
    };
}

// Copy content only. Schedules, consent and publication state are never template data.
export function templateDataFromForm(form, demoMode) {
    const destinationSettings = {};
    for (const id of form.account_ids || []) {
        const setting = form.destination_settings?.[id];
        if (!setting) continue;
        const entry = {};
        if (setting.caption?.trim()) entry.caption = setting.caption;
        if (Object.hasOwn(setting, 'media')) entry.media_ids = (setting.media || []).map(asset => asset.id);
        else if (Object.hasOwn(setting, 'media_ids')) entry.media_ids = [...(setting.media_ids || [])];
        if (Object.hasOwn(setting, 'comments')) entry.comments = (setting.comments || []).map(serializeCommentItem);
        if (Object.keys(entry).length > 0) destinationSettings[id] = entry;
    }
    return {
        brand_id: form.brand_id, is_demo: demoMode, title: form.title,
        caption: form.caption, platform_captions: { ...form.platform_captions },
        media_ids: form.media.map(asset => asset.id),
        platform_media_ids: Object.fromEntries(Object.entries(form.platform_media).map(([platform, assets]) => [platform, assets.map(asset => asset.id)])),
        pillar_id: form.pillar_id || '', angle_id: form.angle_id || '',
        account_ids: [...form.account_ids],
        destination_settings: destinationSettings,
        ...(form.comments?.length ? { comments: form.comments.map(serializeCommentItem) } : {}),
    };
}

// Check at deletion time so newly saved templates are included, not a stale row count.
export async function requireNoTemplateReferences(templates, field, record, t) {
    const count = await templates.count({ [field]: record.id, is_demo: !!record.is_demo });
    if (count) throw new Error(t('{count} templates reference this record. Remove those templates first, or archive/disconnect this record.', { count }));
}
