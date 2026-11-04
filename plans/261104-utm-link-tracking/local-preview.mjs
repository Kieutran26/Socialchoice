import { createApi } from '../../server/index.js';
const api = createApi({ dbPath: ':memory:', siteDirectory: 'dist', frontendPort: 3001, passwordHash: undefined, publicOrigin: undefined, backendOrigin: undefined });
const brand = api.store.write('Brand', { name: 'UTM preview', timezone: 'Asia/Ho_Chi_Minh' });
api.store.write('SocialAccount', { name: 'Preview Page', platform: 'facebook', brand_id: brand.id });
api.server.listen(3001, '127.0.0.1', () => console.log(`Isolated in-memory UTM preview, PID ${process.pid}, port 3001`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => api.server.close(() => process.exit(0)));
