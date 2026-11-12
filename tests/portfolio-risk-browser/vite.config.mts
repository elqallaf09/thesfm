import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('../../', import.meta.url));
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: [
    { find: '@/hooks/useAuth', replacement: fileURLToPath(new URL('./authFixture.tsx', import.meta.url)) },
    { find: '@', replacement: fileURLToPath(new URL('../../src', import.meta.url)) },
  ] },
  // This harness is never built into Next.js or deployed. No real auth/provider calls.
  server: { host: '127.0.0.1', port: 4175, strictPort: true, fs: { allow: [repo] } },
});
