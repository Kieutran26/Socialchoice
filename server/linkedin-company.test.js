import test from 'node:test';
import assert from 'node:assert/strict';
import { linkedinCompanyQuery } from '../src/lib/linkedin-company-query.js';
import { createLinkedinGraph } from './linkedin-graph.js';

test('company lookup accepts exact slugs and LinkedIn company links only', () => {
    for (const value of ['@Microsoft', 'microsoft', 'https://www.linkedin.com/company/microsoft/?trk=test']) assert.equal(linkedinCompanyQuery(value), 'microsoft');
    for (const value of ['', 'Acme Corp', 'https://evil.example/company/microsoft', 'https://linkedin.com/in/member', 'https://linkedin.com.evil.example/company/microsoft', 'https://user@linkedin.com/company/microsoft', '../microsoft', null]) assert.throws(() => linkedinCompanyQuery(value));
});
test('company lookup uses the official API and returns only validated mention identities', async () => {
    const original = globalThis.fetch;
    const graph = createLinkedinGraph({});
    try {
        globalThis.fetch = async (url, options) => {
            const target = new URL(url);
            assert.equal(target.origin, 'https://api.linkedin.com');
            assert.equal(target.searchParams.get('vanityName'), 'microsoft');
            assert.equal(options.headers.Authorization, 'Bearer fixture-token');
            assert.equal(options.redirect, 'manual');
            return Response.json({ elements: [{ id: 1035, localizedName: 'Microsoft', secret: 'must not return' }] });
        };
        assert.deepEqual(await graph.company('fixture-token', '@microsoft'), [{ id: '1035', name: 'Microsoft', urn: 'urn:li:organization:1035', token: '@[Microsoft](urn:li:organization:1035)' }]);
        globalThis.fetch = async () => Response.json({ elements: [] });
        assert.deepEqual(await graph.company('fixture-token', 'missing'), []);
        globalThis.fetch = async () => Response.json({ elements: [{ id: 1035, localizedName: 'bad](urn:li:person:other)' }] });
        await assert.rejects(() => graph.company('fixture-token', 'microsoft'), { status: 502 });
        globalThis.fetch = async () => Response.json({ message: 'private provider response' }, { status: 403 });
        await assert.rejects(() => graph.company('fixture-token', 'microsoft'), error => error.status === 403 && !error.linkedinGrantInvalid && !error.message.includes('private provider'));
        globalThis.fetch = async () => Response.json({}, { status: 401 });
        await assert.rejects(() => graph.company('fixture-token', 'microsoft'), { status: 409 });
    } finally { globalThis.fetch = original; }
});
