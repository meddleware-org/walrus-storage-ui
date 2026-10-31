import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { inlineMeddleware } from '@meddleware/frontend-config/vitest'

// Component tests. The Vue plugin compiles SFCs for @vue/test-utils; jsdom is the DOM they mount
// into. `dedupe` keeps @vue/test-utils
// and the compiled SFCs on a single Vue runtime (else emitted events/reactivity don't cross the
// instance boundary).
export default defineConfig({
  plugins: [vue()],
  resolve: { dedupe: ['vue', '@vue/test-utils'] },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules/**'],
    // @meddleware/ui imports its own .css (each component brings its CSS), which Node cannot import: process it through Vite.
    server: { deps: { inline: inlineMeddleware } },
  },
})
