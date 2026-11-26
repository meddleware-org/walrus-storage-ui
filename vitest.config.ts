// Vitest configuration for the component tests in tests/: the fleet's shared Vue test preset (jsdom, the shared setup) plus the Vue plugin.
// The Vue plugin, defineConfig and the shared preset.
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { vueTestConfig } from '@meddleware/frontend-config/vitest'

// Component tests. The Vue plugin compiles SFCs for @vue/test-utils; jsdom is the DOM they mount into. The real-browser gate lives in e2e/ (Playwright).
// The preset, with the Vue plugin the components need.
export default defineConfig(vueTestConfig({ plugins: [vue()] }))
