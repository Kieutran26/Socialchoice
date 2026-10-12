import { existsSync } from 'node:fs';
import { createApi } from './index.js';
import { runtimeConfig } from './runtime-config.js';

if (!process.env.SOCIALCHOICE_ADMIN_PASSWORD_HASH) throw new Error('Configure an admin password before starting the standalone server');
if (!existsSync('dist/index.html')) throw new Error('Build the frontend before starting the standalone server');
const { host, port } = runtimeConfig();
const { server } = createApi({ siteDirectory: 'dist' });
server.listen(port, host, () => console.log(`Socialchoice standalone server listening on port ${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
