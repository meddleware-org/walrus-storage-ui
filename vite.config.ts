// Vite configuration for the Walrus Storage app: the fleet's shared application preset (@meddleware/frontend-config/vite) plus what is particular to this app
// (the Walrus wasm client is kept out of dependency pre-bundling).
// The Vue plugin, defineConfig and the shared preset.
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { meddlewareApp } from '@meddleware/frontend-config/vite'

// design-tokens and ui resolve from node_modules (published packages). meddlewareApp refuses VITE_E2E outside the e2e mode and keeps
// @meddleware/wallet-adapter (the shared wallet singleton) out of pre-bundling. @mysten/walrus and its wasm are excluded too, so the
// wasm `?url` import resolves.
// The preset, wrapped by defineConfig so the editor can type-check the options.
export default defineConfig(
  meddlewareApp({
    // Vue is the only plugin the app adds.
    plugins: [vue()],
    // The name used for the page title and the web app manifest.
    name: 'Walrus Storage',
    // Options passed through to Vite: the Walrus packages stay out of pre-bundling so the wasm `?url` import resolves.
    config: { optimizeDeps: { exclude: ['@mysten/walrus', '@mysten/walrus-wasm'] } },
  }),
)
