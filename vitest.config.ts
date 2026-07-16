import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      '@orchestration/business-intelligence': path.resolve(__dirname, 'src/orchestration/business-intelligence'),
    },
  },
});
