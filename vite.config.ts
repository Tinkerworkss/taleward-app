import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';

// App-Version aus package.json – eine Quelle für App, Server-Abgleich und Android (versionName/versionCode)
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Web-Fassung liegt unter /app/ (zentrale Website oder eigener Server), Android/Testmodus an der Wurzel
    base: env.VITE_BASE || '/',
    plugins: [react()],
    define: { __APP_VERSION__: JSON.stringify(pkg.version) },
    server: { host: true, port: 5173 }
  };
});
