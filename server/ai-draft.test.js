import test from 'node:test';
import assert from 'node:assert/strict';
import { aiDraftContext, sameAiDraft, applyAiSuggestion } from '../src/lib/ai-draft.js';

const form={brand_id:'brand',pillar_id:'pillar',angle_id:'angle',title:'Title',caption:'Original',media:[{id:'media'}],date:'2026-12-01'};
test('AI suggestions require unchanged context and preserve media, schedule and original form',()=>{
    const origin=aiDraftContext(form);const result=applyAiSuggestion(form,origin,'Suggestion');
    assert.equal(result.caption,'Suggestion');assert.equal(form.caption,'Original');assert.equal(result.media,form.media);assert.equal(result.date,form.date);
    for(const field of ['brand_id','pillar_id','angle_id','title','caption']) {
        const changed={...form,[field]:'Changed'};assert.equal(sameAiDraft(changed,origin),false);assert.equal(applyAiSuggestion(changed,origin,'Suggestion'),changed);
    }
    for(const text of ['',null,' '.repeat(3),'x'.repeat(63207)])assert.equal(applyAiSuggestion(form,origin,text),form);
});
