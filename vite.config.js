import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ mode }) => {
    const env = { ...loadEnv(mode, process.cwd(), 'SOCIALCHOICE_'), ...process.env };
    return {
    plugins: [react()],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
        host: '127.0.0.1', port: Number(env.SOCIALCHOICE_FRONTEND_PORT || 5173), strictPort: true,
        proxy: { '/api': `http://127.0.0.1:${env.SOCIALCHOICE_API_PORT || 3001}` },
    },
    };
});
