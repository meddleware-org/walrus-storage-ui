import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { meddlewareApp } from '@meddleware/frontend-config/vite'

// design-tokens and ui resolve from node_modules (published packages). meddlewareApp refuses VITE_E2E outside the e2e mode and keeps
// @meddleware/wallet-adapter (the shared wallet singleton) out of pre-bundling. @mysten/walrus and its wasm are excluded too, so the
// wasm `?url` import resolves.
export default defineConfig(
  meddlewareApp({
    plugins: [vue()],
    config: { optimizeDeps: { exclude: ['@mysten/walrus', '@mysten/walrus-wasm'] } },
  }),
)
