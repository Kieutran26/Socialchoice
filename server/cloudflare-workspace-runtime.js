import { cloudflareSqlite } from './cloudflare-sqlite.js';
import { createStoreCore } from './store-core.js';
import { SqliteMap } from './sqlite-map.js';
import { createAdminAuth } from './admin-auth.js';
import { createCustomerWorkspaceAuth } from './customer-context.js';
import { metaConfig } from './meta-config.js';
import { linkedinConfig } from './linkedin-config.js';
import { threadsConfig } from './threads-config.js';
import { tiktokConfig } from './tiktok-config.js';
import { createMetaConnection } from './meta-connection.js';
import { createLinkedinConnection } from './linkedin-connection.js';
import { createThreadsConnection } from './threads-connection.js';
import { createTiktokConnection } from './tiktok-connection.js';
import { createTiktokGraph } from './tiktok-graph.js';
import { createTiktokTokens } from './tiktok-tokens.js';
import { createFacebookPublisher } from './facebook-publisher.js';
import { createHttpHandler } from './http-handler.js';
import { createAdminWebLicenses } from './admin-web-licenses.js';
import { createLicenseAuthority } from './license-authority.js';
import { fail } from './validation.js';
import { licensedGraph } from './licensed-graph.js';

export function createCloudWorkspaceRuntime(ctx, env, customerId) {
    if (!/^[a-f0-9]{64}$/i.test(env.SOCIALCHOICE_STORAGE_KEY || '') || !customerId && !env.SOCIALCHOICE_ADMIN_PASSWORD_HASH) return null;
    const publicOrigin = env.SOCIALCHOICE_PUBLIC_ORIGIN, backendOrigin = env.SOCIALCHOICE_BACKEND_ORIGIN;
    for (const origin of [publicOrigin, backendOrigin]) if (!origin || new URL(origin).origin !== origin || !origin.startsWith('https://')) throw new Error('HTTPS app and backend origins required');
    const store = createStoreCore(cloudflareSqlite(ctx.storage), work => ctx.storage.transactionSync(work));
    const privateMap = name => new SqliteMap(store, env.SOCIALCHOICE_STORAGE_KEY, name);
    const auth = customerId ? createCustomerWorkspaceAuth(privateMap, env) : createAdminAuth(env.SOCIALCHOICE_ADMIN_PASSWORD_HASH, true, { sessions: privateMap('sessions'), throttle: privateMap('throttle') });
    const authority = createLicenseAuthority(env);
    const authorize = customerId ? async () => {
        if (!auth.licenseActive()) fail('A valid Socialchoice web license is required', 403);
        const status = await authority('status', auth.licenseId());
        if (!status.active) fail('This license has been revoked. Contact the site owner.', 403);
    } : undefined;
    const metaSettings = metaConfig(env), linkedinSettings = linkedinConfig(env), threadsSettings = threadsConfig(env), tiktokSettings = tiktokConfig(env);
    for (const settings of [metaSettings, threadsSettings, tiktokSettings]) { settings.mediaOrigin = backendOrigin; if (customerId) settings.mediaPathPrefix = '/api/workspaces/' + customerId; }
    for (const settings of [metaSettings, linkedinSettings, threadsSettings]) if (settings.ready && settings.origin !== publicOrigin) throw new Error('Integration callback origin mismatch');
    const meta = createMetaConnection(store, auth, metaSettings, { states: privateMap('oauth'), pending: privateMap('pages') });
    const linkedin = createLinkedinConnection(store, auth, linkedinSettings, { states: privateMap('linkedin-oauth'), pending: privateMap('linkedin-profile') });
    const threads = createThreadsConnection(store, auth, threadsSettings, { states: privateMap('threads-oauth'), pending: privateMap('threads-profile') });
    const tiktokGraph = tiktokSettings.ready ? createTiktokGraph(tiktokSettings) : null;
    const tiktokTokens = createTiktokTokens(store, tiktokSettings, licensedGraph(tiktokGraph, authorize)), tiktokCreators = privateMap('tiktok-creators');
    const tiktok = createTiktokConnection(store, auth, tiktokSettings, { graph: tiktokGraph, tokens: tiktokTokens, creators: tiktokCreators, states: privateMap('tiktok-oauth'), pending: privateMap('tiktok-profile') });
    const publisher = createFacebookPublisher(store, metaSettings, { linkedinConfig: linkedinSettings, threadsConfig: threadsSettings, tiktokConfig: tiktokSettings, tiktokTokens, tiktokCreators, tiktokGraph, authorize, wake: async time => { const alarm = await ctx.storage.getAlarm(); if (!alarm || time < alarm) await ctx.storage.setAlarm(time); } });
    const allowedHosts = new Set([new URL(publicOrigin).hostname, new URL(backendOrigin).hostname]);
    const licenseAdmin = customerId ? undefined : createAdminWebLicenses(store, privateMap('issued-web-licenses'), env, authority);
    const handler = createHttpHandler({ store, auth, meta, linkedin, threads, tiktok, tiktokSettings, publisher, metaSettings, threadsSettings, publicOrigin, allowedHosts, licenseAdmin, hosted: true });
    return { store, auth, publisher, handler, authorize };
}
