import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // Exclude E2E tests from unit tests
    exclude: [
      '**/node_modules/**',
      '**/tests/e2e/**',
      '**/playwright-report/**',
    ],
    globals: true,
  },
});
