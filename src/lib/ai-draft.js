// Only the fields sent for AI context participate; applying a suggestion never replaces other form fields.
export function aiDraftContext(form) {
    return { brand_id: form.brand_id, title: form.title, caption: form.caption, pillar_id: form.pillar_id || '', angle_id: form.angle_id || '' };
}
export function sameAiDraft(left,right) {return JSON.stringify(aiDraftContext(left))===JSON.stringify(aiDraftContext(right));}
export function applyAiSuggestion(current,origin,text) {
    if(!sameAiDraft(current,origin) || typeof text!=='string' || !text.trim() || text.length>63206)return current;
    return {...current,caption:text};
}
