import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [react(), {
        name: 'desktop-local-assets',
        enforce: 'pre',
        transformIndexHtml: {
            order: 'pre',
            handler: html => html
                .replace(/\s*<link\b[^>]*(?:fonts\.googleapis\.com|fonts\.gstatic\.com)[^>]*>/g, '')
                .replace('/src/main.jsx', '/src/desktop-main.jsx'),
        },
        transform(code, id) {
            const path = id.replaceAll('\\', '/');
            if (path.endsWith('/src/index.css')) return code.replace(/@font-face\s*\{[^}]*https:\/\/cdn\.jsdelivr\.net[^}]*\}/g, '');
            if (path.includes('@fontsource-variable/mona-sans/') && path.endsWith('.css')) return code.replaceAll("'Mona Sans Variable'", "'Mona Sans'");
        },
    }],
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    base: './',
    build: { outDir: 'dist-desktop' },
    server: { host: '127.0.0.1', port: 1420, strictPort: true, watch: { ignored: ['**/src-tauri/**'] } },
    clearScreen: false,
});
