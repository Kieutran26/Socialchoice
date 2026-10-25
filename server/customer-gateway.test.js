import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createCustomerGateway } from './customer-gateway.js';
import { CONTEXT_HEADER, readCustomerContext } from './customer-context.js';

test('account recovery codes return before workspace availability and bootstrap retries after failure', async () => {
    const origin = 'https://app.example', key = randomBytes(32).toString('hex');
    let ready = false, available = false, calls = 0;
    const identity = { id: randomUUID(), email: 'fixture@example.com', session: 'a'.repeat(64), expires: Date.now() + 3600000, license: 'fixture' };
    const directory = {
        register: () => ({ recoveryCode: 'saved-registration-code', cookie: 'socialchoice_customer=fixture' }),
        recover: () => ({ recoveryCode: 'saved-recovery-code', cookie: 'socialchoice_customer=fixture' }),
        resolve: () => ({ ...identity, needsBootstrap: !ready }), workspaceReady: () => { ready = true; },
    };
    const gateway = createCustomerGateway({ directory, env: { SOCIALCHOICE_PUBLIC_ORIGIN: origin, SOCIALCHOICE_BACKEND_ORIGIN: origin, SOCIALCHOICE_STORAGE_KEY: key },
        forwardOwner: () => { throw new Error('Unexpected owner routing'); },
        forwardCustomer: (_id, request) => { calls++; assert.equal(readCustomerContext(request.headers.get(CONTEXT_HEADER), key).bootstrap, !ready); return new Response('', { status: available ? 200 : 503 }); },
    });
    for (const operation of ['register', 'recover']) {
        const input = operation === 'register' ? { email: identity.email, password: 'fixture', license: 'fixture' } : { email: identity.email, password: 'fixture', recoveryCode: 'fixture' };
        const response = await gateway(new Request(origin + '/api/customer/' + operation, { method: 'POST', headers: { 'content-type': 'application/json', 'x-socialchoice-client': 'local-ui' }, body: JSON.stringify({ args: [input] }) }));
        assert.equal(response.status, 200); assert.ok((await response.json()).recoveryCode); assert.ok(response.headers.get('set-cookie')); assert.equal(calls, 0);
    }
    assert.equal((await gateway(new Request(origin + '/api/session'))).status, 503); assert.equal(ready, false);
    available = true;
    assert.equal((await gateway(new Request(origin + '/api/session'))).status, 200); assert.equal(ready, true);
    assert.equal((await gateway(new Request(origin + '/api/session'))).status, 200);
});

test('customer logout revokes the central session without requiring a reachable workspace', async () => {
    let revoked = false;
    const gateway = createCustomerGateway({
        env: { SOCIALCHOICE_PUBLIC_ORIGIN: 'https://app.example', SOCIALCHOICE_BACKEND_ORIGIN: 'https://app.example' },
        directory: { resolve: () => ({ session: 'fixture' }), logout: () => { revoked = true; return 'socialchoice_customer=; Max-Age=0'; } },
        forwardCustomer: () => { throw new Error('Workspace unavailable'); }, forwardOwner: () => { throw new Error('Unexpected owner route'); },
    });
    const response = await gateway(new Request('https://app.example/api/auth/logout', { method: 'POST', headers: { cookie: 'socialchoice_customer=fixture', 'x-socialchoice-client': 'local-ui' } }));
    assert.equal(response.status, 200); assert.equal(revoked, true); assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
});
