import test from 'node:test';
import assert from 'node:assert/strict';
import { insertMention, mentionRange, mentionSuggestions } from '../src/lib/linkedin-mention-input.js';
import { parseLinkedinMentions } from '../src/lib/publishing-content.js';

test('inline @ activation respects the caret, email addresses, selections and existing tokens', () => {
    assert.deepEqual(mentionRange('Hello @Tran suffix', 11), { start: 6, end: 11, query: 'Tran' });
    assert.equal(mentionRange('email@company', 13), null);
    assert.equal(mentionRange('@[Name](urn:li:person:id)', 23), null);
    assert.equal(mentionRange('@Tran', 2, 5), null);
    assert.equal(mentionRange('hello\n@', 7)?.query, '');
    assert.equal(mentionRange('@' + 'x'.repeat(81), 82), null);
    const nested = '@[Alice @Bob](urn:li:person:id)';
    assert.equal(mentionRange(nested, nested.indexOf(']')), null);
});

test('suggestions use real connected LinkedIn IDs, deduplicate and match Vietnamese names', () => {
    const accounts = [
        { name: 'Nguyễn Kiều Trân', external_id: 'member_1', platform: 'linkedin', connection_status: 'connected' },
        { name: 'Disconnected', external_id: 'member_2', platform: 'linkedin', connection_status: 'disconnected' },
        { name: 'Facebook', external_id: '123', platform: 'facebook', connection_status: 'connected' },
        { name: 'Invalid', external_id: '../bad', platform: 'linkedin', connection_status: 'connected' },
    ];
    const suggestions = mentionSuggestions(accounts, '@[Nguyễn Kiều Trân](urn:li:person:member_1)', 'kieu tran');
    assert.equal(suggestions.length, 1);
    assert.equal(suggestions[0].urn, 'urn:li:person:member_1');
    assert.equal(mentionSuggestions(accounts, '', '').length, 1);
    assert.equal(mentionSuggestions([{ name: 'Đặng Văn An', external_id: 'member_3', platform: 'linkedin', connection_status: 'connected' }], '', 'dang')[0].name, 'Đặng Văn An');
});

test('insert at caret preserves both sides and retains the LinkedIn publishing attributes', () => {
    const value = 'Hello @Tra, welcome';
    const range = mentionRange(value, 10);
    const inserted = insertMention(value, range, '@[Trân](urn:li:person:member_1)');
    assert.equal(inserted.value, 'Hello @[Trân](urn:li:person:member_1), welcome');
    const parsed = parseLinkedinMentions(inserted.value);
    assert.equal(parsed.text, 'Hello Trân, welcome');
    assert.equal(parsed.attributes.length, 1);
    assert.equal(insertMention(value, null, 'invalid'), null);
});
