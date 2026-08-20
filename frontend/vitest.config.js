import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    environmentOptions: {
      pretendToBeVisual: true,
    },
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
  },
});
