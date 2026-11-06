import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ mode }) => {
    const env = { ...loadEnv(mode, process.cwd(), 'SOCIALCHOICE_'), ...process.env };
    const target = env.SOCIALCHOICE_LOCAL_API === 'true'
        ? `http://127.0.0.1:${env.SOCIALCHOICE_API_PORT || 3002}`
        : 'https://socialchoice-api.nguyenngockieutran.workers.dev';

    return {
        plugins: [react()],
        resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
        server: {
            host: '127.0.0.1',
            port: Number(env.SOCIALCHOICE_FRONTEND_PORT || 5174),
            strictPort: true,
            proxy: {
                '/api': {
                    target,
                    changeOrigin: true,
                    secure: false,
                    headers: {
                        origin: 'https://socialchoice.vercel.app',
                    },
                    configure: (proxy) => {
                        proxy.on('proxyRes', (proxyRes) => {
                            const setCookie = proxyRes.headers['set-cookie'];
                            if (setCookie) {
                                proxyRes.headers['set-cookie'] = setCookie.map((c) =>
                                    c.replace(/;\s*Secure/gi, '').replace(/SameSite=Strict/gi, 'SameSite=Lax')
                                );
                            }
                        });
                    },
                },
            },
        },
    };
});
