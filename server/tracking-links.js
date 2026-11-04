import { createHash } from 'node:crypto';
import { fail } from './validation.js';
import { buildUtmCaptions, publicDestination, validateUtm } from '../src/lib/utm-links.js';

export const TRACKING_PATH = /^\/api\/links\/go\/(owner|[a-f0-9-]{36})\/([a-f0-9-]{36})$/;
export const SHORT_PATH = /^\/s\/([a-zA-Z0-9_-]{4,36})$/;
export function createTrackingLinks(store, scope = 'owner') {
    return {
        redirect(req, res) {
            const path = new URL(req.url, 'http://localhost').pathname;
            const matchLegacy = path.match(TRACKING_PATH);
            const matchShort = path.match(SHORT_PATH);
            if (!matchLegacy && !matchShort) return false;
            if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return true; }
            let link = null;
            if (matchLegacy) {
                link = matchLegacy[1] === scope ? store.trackingLinks.get(matchLegacy[2]) : null;
            } else if (matchShort) {
                link = store.trackingLinks.getByCode ? store.trackingLinks.getByCode(matchShort[1]) : store.trackingLinks.get(matchShort[1]);
            }
            if (!link || !link.active) { res.writeHead(link ? 410 : 404, { 'Cache-Control': 'no-store' }); res.end(); return true; }
            publicDestination(link.target);
            const preview = /prefetch|prerender/i.test(`${req.headers['purpose'] || ''} ${req.headers['sec-purpose'] || ''}`) || /bot|crawler|spider|facebookexternalhit|slackbot|linkedinbot/i.test(req.headers['user-agent'] || '');
            if (req.method === 'GET' && !preview) store.transaction(() => store.trackingLinks.hit(link.id));
            res.writeHead(302, { Location: link.target, 'Cache-Control': 'no-store, max-age=0', 'Referrer-Policy': 'no-referrer', 'X-Robots-Tag': 'noindex, nofollow' }); res.end(); return true;
        },
        execute(operation, input, origin) {
            if (!input || typeof input.brand_id !== 'string') fail('Choose a brand');
            const brand = store.get('Brand', input.brand_id);
            if (operation === 'list') {
                return {
                    links: store.trackingLinks.list(brand.id).map(link => {
                        const shortUrl = `${origin}/s/${link.code || link.id}`;
                        return {
                            ...link,
                            url: shortUrl,
                            short_url: shortUrl,
                            legacy_url: `${origin}/api/links/go/${scope}/${link.id}`,
                        };
                    }),
                };
            }
            if (operation === 'disable') {
                const link = store.trackingLinks.get(input.id);
                if (!link || link.brand_id !== brand.id) fail('Link not found', 404);
                store.trackingLinks.disable(link.id); return { ok: true };
            }
            if (operation === 'create') {
                if (!input.url || typeof input.url !== 'string') fail('Enter a valid URL to shorten');
                publicDestination(input.url);
                const campaign = (input.campaign || 'shortlink').trim();
                const key = createHash('sha256').update(JSON.stringify([brand.id, input.url, campaign, input.platform || ''])).digest('hex');
                const link = store.trackingLinks.create(key, {
                    brand_id: brand.id,
                    is_demo: brand.is_demo,
                    target: input.url,
                    platform: input.platform || 'direct',
                    account_id: '',
                    campaign,
                });
                const shortUrl = `${origin}/s/${link.code || link.id}`;
                return {
                    ...link,
                    url: shortUrl,
                    short_url: shortUrl,
                    legacy_url: `${origin}/api/links/go/${scope}/${link.id}`,
                };
            }
            if (operation !== 'build' || brand.status === 'archived') fail('Choose an active brand');
            try { validateUtm(input.options); } catch (e) { fail(e.message); }
            const form = input.form;
            if (!form || typeof form.caption !== 'string' || form.caption.length > 63206 || !Array.isArray(form.account_ids) || form.account_ids.length > 30 || new Set(form.account_ids).size !== form.account_ids.length) fail('Invalid link content');
            for (const value of [form.platform_captions, form.destination_settings]) if (value !== undefined && (!value || typeof value !== 'object' || Array.isArray(value))) fail('Invalid link content');
            if (form.account_ids.some(id => typeof id !== 'string')) fail('Invalid account');
            const accounts = form.account_ids.map(id => store.get('SocialAccount', id));
            if (accounts.some(a => a.brand_id !== brand.id || a.is_demo !== brand.is_demo)) fail('Cross-brand or demo/live association is not allowed');
            const captions = { ...form.platform_captions, ...Object.fromEntries(Object.entries(form.destination_settings || {}).map(([id, value]) => [id, value?.caption])) };
            if (Object.keys(captions).length > 50 || Object.values(captions).some(value => value !== undefined && (typeof value !== 'string' || value.length > 63206))) fail('Invalid link content');
            return store.transaction(() => {
                let count = 0;
                const result = buildUtmCaptions(form, accounts, input.options, (target, context) => {
                    if (++count > 100) fail('Apply tracking to at most 100 links at a time');
                    if (!input.options.tracking) return target;
                    const key = createHash('sha256').update(JSON.stringify([brand.id, target, context])).digest('hex');
                    const link = store.trackingLinks.create(key, { brand_id: brand.id, is_demo: brand.is_demo, target, platform: context.platform, account_id: context.accountId, campaign: new URL(target).searchParams.get('utm_campaign') || input.options.campaign.trim() });
                    if (!link.active) fail('A matching tracking link was disabled. Use a different campaign.');
                    if (input.options?.short || input.short) {
                        return `${origin}/s/${link.code || link.id}`;
                    }
                    return `${origin}/api/links/go/${scope}/${link.id}`;
                }, origin);
                return result;
            });
        },
    };
}
