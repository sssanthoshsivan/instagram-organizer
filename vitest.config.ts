import { defineConfig } from 'vitest/config';

// Standalone Vitest config. Kept separate so the extension builder
// (`vite build` via `tsc -b && vite build`) never loads the CRX plugin
// when running unit tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: true,
  },
});
