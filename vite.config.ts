import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { assertE2eOnlyInE2eMode, themeInit, viteTarget } from '@meddleware/frontend-config/vite'

// design-tokens and ui resolve from node_modules (published packages).
// @mysten/walrus is excluded from dep-optimization so its wasm `?url` import resolves.
export default defineConfig(({ mode }) => {
  // The end-to-end build (`--mode e2e`) includes a mock wallet; nothing else may.
  assertE2eOnlyInE2eMode(mode)
  return {
    build: { target: viteTarget() },
    plugins: [vue(), themeInit({ default: 'dark' })],
    optimizeDeps: {
      // @meddleware/wallet-adapter ships TS + .vue source and holds the shared wallet singleton; if it
      // were pre-bundled, its .vue files (served raw) would load a second copy of the singleton in dev.
      exclude: ['@mysten/walrus', '@mysten/walrus-wasm', '@meddleware/wallet-adapter'],
    },
  }
})
