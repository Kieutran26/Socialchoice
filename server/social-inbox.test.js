// server/social-inbox.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
    detectPhoneNumbers,
    maskPhoneNumber,
    maskPhonesInText,
    getConversations,
    replyToConversation,
    togglePhoneShield,
    generateAiSuggestedReplies,
} from '../src/lib/social-inbox-service.js';

test('detectPhoneNumbers: correctly detects standard Vietnamese 10-digit mobile numbers', () => {
    const text = 'Khách đặt 2 hộp, SĐT: 0988123456, gọi trước khi giao.';
    const detected = detectPhoneNumbers(text);
    assert.equal(detected.length, 1);
    assert.equal(detected[0], '0988123456');
});

test('detectPhoneNumbers: detects phone numbers formatted with spaces, dots, or dashes', () => {
    const text = 'Gọi số 090 334 5678 hoặc 091.298.7654 hay 098-112-3344';
    const detected = detectPhoneNumbers(text);
    assert.equal(detected.length, 3);
    assert.ok(detected.includes('090 334 5678'));
    assert.ok(detected.includes('091.298.7654'));
    assert.ok(detected.includes('098-112-3344'));
});

test('detectPhoneNumbers: detects +84 international format', () => {
    const text = 'Liên hệ hotline +84988123456 nhé';
    const detected = detectPhoneNumbers(text);
    assert.equal(detected.length, 1);
    assert.equal(detected[0], '+84988123456');
});

test('detectPhoneNumbers: does not falsely trigger on non-phone numbers', () => {
    const text = 'Mã đơn hàng 123456, giá 250.000đ, ngày 15/10/2026';
    const detected = detectPhoneNumbers(text);
    assert.equal(detected.length, 0);
});

test('maskPhoneNumber: masks middle digits of phone number', () => {
    const masked = maskPhoneNumber('0988123456');
    assert.equal(masked, '098****456');
});

test('maskPhonesInText: replaces phone numbers in text with masked format', () => {
    const input = 'Giao về 45 Lê Duẩn, sđt 0988123456 nha bạn.';
    const output = maskPhonesInText(input);
    assert.ok(output.includes('098****456'));
    assert.ok(!output.includes('0988123456'));
});

test('getConversations: filters correctly by brand and platform', () => {
    const all = getConversations();
    assert.ok(all.length >= 4);

    const skincare = getConversations({ brandId: 'b_skincare' });
    assert.ok(skincare.every((c) => c.brand_id === 'b_skincare'));

    const fbOnly = getConversations({ platform: 'facebook' });
    assert.ok(fbOnly.every((c) => c.platform === 'facebook'));
});

test('getConversations: filters shielded conversations', () => {
    const shielded = getConversations({ status: 'shielded' });
    assert.ok(shielded.length > 0);
    assert.ok(shielded.every((c) => c.has_phone && c.phone_hidden));
});

test('generateAiSuggestedReplies: creates relevant replies for orders with phone numbers', () => {
    const testConv = {
        customer: { name: 'Nguyễn Văn A' },
        has_phone: true,
        messages: [{ text: 'Ship cho mình 2 hũ sđt 0988123456' }],
    };
    const suggestions = generateAiSuggestedReplies(testConv);
    assert.ok(suggestions.length >= 2);
    assert.ok(suggestions.some((s) => s.text.includes('Nguyễn Văn A')));
});
