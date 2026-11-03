import { createApi } from '../../server/index.js';
import { bulkWorkbook } from '../../server/bulk-post-fixture.js';
import { writeFileSync } from 'node:fs';

const api = createApi({ dbPath: ':memory:', siteDirectory: 'dist', frontendPort: 3001, passwordHash: undefined, publicOrigin: undefined, backendOrigin: undefined });
const brand = api.store.write('Brand', { name: 'Bulk upload preview', timezone: 'Asia/Ho_Chi_Minh' });
api.store.write('SocialAccount', { name: 'Preview destination', platform: 'facebook', brand_id: brand.id });
writeFileSync('data/bulk-upload-preview.xlsx', bulkWorkbook());
writeFileSync('data/bulk-upload-preview.csv', '\uFEFFtitle,caption,date,time\r\nCSV draft,"Nội dung tiếng Việt\nDòng hai",2030-02-01,09:30\r\n');
writeFileSync('data/bulk-upload-invalid.csv', 'title,caption,date,time\r\nBad date,Caption,2030-02-30,09:30\r\n');
api.server.listen(3001, '127.0.0.1', () => console.log(`Isolated in-memory preview: port 3001, PID ${process.pid}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => api.server.close(() => process.exit(0)));
