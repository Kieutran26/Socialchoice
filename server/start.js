import { existsSync } from 'node:fs';
import { createApi } from './index.js';

if (!process.env.SOCIALCHOICE_ADMIN_PASSWORD_HASH) throw new Error('Configure an admin password before starting the standalone server');
if (!existsSync('dist/index.html')) throw new Error('Build the frontend before starting the standalone server');
const { server } = createApi({ siteDirectory: 'dist' });
const port = Number(process.env.SOCIALCHOICE_API_PORT || 3001);
server.listen(port, '127.0.0.1', () => console.log(`Socialchoice standalone server: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
