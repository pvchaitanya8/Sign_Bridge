/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react            from '@vitejs/plugin-react'
import tailwindcss      from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: { port: 5173 },

  test: {
    environment: 'jsdom',
    globals:     true,                          // describe/it/expect without imports
    setupFiles:  ['./src/test/setup.ts'],       // jest-dom matchers
    css:         false,                         // skip CSS processing in tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include:  ['src/**/*.{ts,tsx}'],
      exclude:  ['src/test/**', 'src/main.tsx'],
    },
  },
})
