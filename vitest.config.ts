import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['__tests__/setup.ts'],
    // API tests require a live server — excluded from default run
    // Run them separately with: pnpm test:api
    exclude: ['**/node_modules/**', '__tests__/api/**'],
    coverage: {
      reporter: ['text', 'html'],
      include: ['lib/**', 'etl/utils.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
