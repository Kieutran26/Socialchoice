import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { createStore } from '../../server/store.js';
import { createMetaVault } from '../../server/meta-vault.js';
import { createFacebookPublisher } from '../../server/facebook-publisher.js';
import { createHttpHandler } from '../../server/http-handler.js';
import { serveSite } from '../../server/static-site.js';

// Disposable UI fixture: no real credentials, timer delivery disabled, no external publication.
const store = createStore(':memory:'), config = { ready: true, key: randomBytes(32).toString('hex'), appSecret: 'fixture-only', version: 'v26.0' };
const brand = store.write('Brand', { name: 'Evergreen preview', timezone: 'Asia/Ho_Chi_Minh' });
const scopes = ['pages_manage_posts'];
createMetaVault(store, config.key).save('preview', { token: 'not-a-live-token', scopes, tasks: ['CREATE_CONTENT'] });
const account = store.verifiedAccount({ name: 'Preview Page', platform: 'facebook', account_type: 'page', brand_id: brand.id, external_id: '123456', credential_id: 'preview', scopes, connection_status: 'connected' });
const post = store.write('Post', { title: 'Giới thiệu dịch vụ Socialchoice', caption: 'Lên kế hoạch và quản lý nội dung cùng Socialchoice. Đây là bản thử giao diện riêng, không đăng thật.', brand_id: brand.id, account_ids: [account.id], timezone: 'Asia/Ho_Chi_Minh' });
const publisher = createFacebookPublisher(store, config, { wake: async () => {} });
const server = createServer(createHttpHandler({ store, publisher, auth: { enabled: false, require() {} }, metaSettings: config, frontendPort: 3001, allowedHosts: ['127.0.0.1', 'localhost'], serveStatic: (req, res) => serveSite(req, res, 'dist') }));
server.listen(3001, '127.0.0.1', () => console.log(`Isolated recurring preview PID ${process.pid}, port 3001: http://127.0.0.1:3001/posts?post=${post.id}`));
server.on('close', () => { publisher.close(); store.close(); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
