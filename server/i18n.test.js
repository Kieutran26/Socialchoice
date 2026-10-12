import test from 'node:test';
import assert from 'node:assert/strict';
import { translate, setLanguage, getLanguage, getLocale, normalizeLanguage, subscribeLanguage, LANGUAGE_STORAGE_KEY, messages } from '../src/lib/i18n-core.js';
import { POST_STATUS_LABEL, CONNECTION_LABEL, PLATFORM_LABEL, PLATFORMS } from '../src/lib/constants.js';
import { localizeValidation } from '../src/components/ui/form-validation.js';
import { dateKey, formatDateTime, formatNumber, formatCalendarDate } from '../src/lib/format.js';

test('locale catalog interpolates labels and preserves supplied content', () => {
    assert.equal(translate('Draft', {}, 'vi'), 'Bản nháp');
    assert.equal(translate('Draft', {}, 'en'), 'Draft');
    assert.equal(translate('{count}m ago', { count: 5 }, 'vi'), '5 phút trước');
    const content = 'Nội dung khách hàng viết — Green Brand 42';
    assert.equal(translate(content, {}, 'vi'), content);
    assert.equal(translate('{count}m ago', {}, 'vi'), '{count} phút trước');
    assert.equal(normalizeLanguage('unsupported'), 'vi');
    assert.equal(translate('s', {}, 'vi'), '');
    assert.equal(translate('constructor', {}, 'vi'), 'constructor');
    assert.equal(translate('Unsupported field: constructor', {}, 'vi'), 'Trường không được hỗ trợ: constructor');
    assert.equal(translate('{count}m ago', {count: 12345}, 'vi'), '12.345 phút trước');
});

test('all Vietnamese templates preserve every interpolation slot', () => {
    const slots = (text) => [...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]))].sort();
    for (const [key, value] of Object.entries(messages)) {
        assert.equal(typeof value, 'string', key);
        assert.deepEqual(slots(value), slots(key), `Interpolation mismatch: ${key}`);
    }
});

test('language switch persists preference and changes system labels without changing keys', () => {
    const previousWindow = globalThis.window;
    const stored = new Map();
    const events = new Map();
    globalThis.window = {
        localStorage: { getItem: (key) => stored.get(key), setItem: (key, value) => stored.set(key, value) },
        addEventListener: (name, handler) => events.set(name, handler),
        removeEventListener: (name, handler) => { if (events.get(name) === handler) events.delete(name); },
    };
    try {
        setLanguage('en');
        let updates = 0;
        const unsubscribe = subscribeLanguage(() => updates++);
        setLanguage('vi');
        assert.equal(getLanguage(), 'vi');
        assert.equal(getLocale(), 'vi-VN');
        assert.equal(stored.get(LANGUAGE_STORAGE_KEY), 'vi');
        assert.equal(POST_STATUS_LABEL.draft, 'Bản nháp');
        assert.equal(CONNECTION_LABEL.configuration_required, 'Cần cấu hình');
        assert.equal(PLATFORM_LABEL.facebook, 'Trang Facebook');
        assert.equal(PLATFORM_LABEL.facebook, PLATFORMS[0].label);
        assert.ok(Object.keys(POST_STATUS_LABEL).includes('published'));
        stored.set(LANGUAGE_STORAGE_KEY, 'en');
        events.get('storage')({ key: LANGUAGE_STORAGE_KEY });
        assert.equal(POST_STATUS_LABEL.draft, 'Draft');
        assert.equal(PLATFORM_LABEL.facebook, 'Facebook Pages');
        assert.equal(getLanguage(), 'en');
        assert.equal(updates, 2);
        unsubscribe();
        assert.equal(events.size, 0);
    } finally { setLanguage('vi'); globalThis.window = previousWindow; }
});

test('blocked browser storage does not break language switching', () => {
    const previousWindow = globalThis.window;
    globalThis.window = { localStorage: { setItem: () => { throw new Error('blocked'); } } };
    try { setLanguage('en'); assert.equal(getLanguage(), 'en'); setLanguage('vi'); assert.equal(getLanguage(), 'vi'); }
    finally { setLanguage('vi'); globalThis.window = previousWindow; }
});

test('structured server validation messages are localized without fabricating integration state', () => {
    assert.equal(translate('brand_id is required', {}, 'vi'), 'Cần nhập thương hiệu');
    assert.equal(translate('Invalid UTC timestamp: scheduled_at', {}, 'vi'), 'Thời gian UTC không hợp lệ: thời gian lên kế hoạch');
    assert.equal(translate('Meta OAuth is not configured; a manual account cannot be connected', {}, 'vi'), 'Chưa cấu hình Meta OAuth; tài khoản nhập thủ công chưa được kết nối');
    assert.equal(translate('Publishing and automatic delivery are not implemented in Phase A.', {}, 'vi'), 'Chức năng đăng bài và đăng tự động chưa được triển khai trong Giai đoạn A.');
});

test('localized date and number display preserves calendar keys and UTC instant', () => {
    const instant = '2026-10-20T02:00:00.000Z';
    try {
        setLanguage('en');
        const english = formatDateTime(instant);
        const key = dateKey(instant);
        setLanguage('vi');
        assert.notEqual(formatDateTime(instant), english);
        assert.equal(dateKey(instant), key);
        assert.equal(key, '2026-10-20');
        assert.equal(formatNumber(12345), new Intl.NumberFormat('vi-VN').format(12345));
        assert.equal(new Date(instant).toISOString(), instant);
        assert.equal(formatCalendarDate('2026-10-20'), new Intl.DateTimeFormat('vi-VN', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date('2026-10-20T00:00:00Z')));
    } finally { setLanguage('vi'); }
});

test('Vietnamese required/range validation and English browser fallback', () => {
    const control = {
        message: '', min: '0', max: '100',
        validity: { valueMissing: true, rangeUnderflow: false, rangeOverflow: false, valid: false },
        setCustomValidity(message) { this.message = message; },
    };
    try {
        setLanguage('vi');
        localizeValidation(control);
        assert.equal(control.message, 'Vui lòng điền trường này.');
        control.validity.valueMissing = false;
        control.validity.rangeOverflow = true;
        localizeValidation(control);
        assert.ok(control.message.includes('100'));
        setLanguage('en');
        localizeValidation(control);
        assert.equal(control.message, '');
    } finally { setLanguage('vi'); }
});
