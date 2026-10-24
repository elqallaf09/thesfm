import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  plugins: [tsconfigPaths()],
  oxc: { jsx: { runtime: 'automatic', importSource: 'react' } },
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./src/__tests__/server-only.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    // Unit tests explicitly stub service settings. Never inherit a live project
    // from a developer's .env.local when resolving the catalog or auth mocks.
    env: {
      NEXT_PUBLIC_SUPABASE_URL: '',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
      SUPABASE_SERVICE_ROLE_KEY: '',
      DATABASE_SERVICE_ROLE_KEY: '',
    },
    include: [
      'src/__tests__/**/*.test.ts',
      'src/__tests__/**/*.test.tsx',
      'src/domain/economic-intelligence/__tests__/**/*.test.ts',
      '.github/scripts/__tests__/**/*.test.mjs',
      // Specialist engine/adapter regressions live beside their implementation.
      'src/lib/investments/intelligence/**/*.test.ts',
      'src/lib/market/**/*.test.ts',
    ],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/supabase/**', 'src/lib/translations/**', 'src/lib/**/*.test.ts'],
    },
  },
});
