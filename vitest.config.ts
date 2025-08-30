import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts','**/__test__/**/*.test.ts'],
    exclude: ['node_modules', 'dist', 'build', 'main.js'],
  },
  resolve: {
    alias: {
      // Mock obsidian package
      'obsidian': new URL('./mocks/obsidian.ts', import.meta.url).pathname,
    },
  },

})
