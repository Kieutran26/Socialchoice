// Copy content only. Schedules, consent and publication state are never template data.
export function templateDataFromForm(form, demoMode) {
    return {
        brand_id: form.brand_id, is_demo: demoMode, title: form.title,
        caption: form.caption, platform_captions: { ...form.platform_captions },
        media_ids: form.media.map(asset => asset.id),
        platform_media_ids: Object.fromEntries(Object.entries(form.platform_media).map(([platform, assets]) => [platform, assets.map(asset => asset.id)])),
        pillar_id: form.pillar_id || '', angle_id: form.angle_id || '',
        account_ids: [...form.account_ids],
        destination_settings: Object.fromEntries(form.account_ids.filter(id => form.destination_settings[id]?.caption?.trim()).map(id => [id, { caption: form.destination_settings[id].caption }])),
    };
}

// Check at deletion time so newly saved templates are included, not a stale row count.
export async function requireNoTemplateReferences(templates, field, record, t) {
    const count = await templates.count({ [field]: record.id, is_demo: !!record.is_demo });
    if (count) throw new Error(t('{count} templates reference this record. Remove those templates first, or archive/disconnect this record.', { count }));
}
