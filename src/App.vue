<script setup lang="ts">
// Standalone shell for the Walrus SPA: app header + footer wrapping the core tool view.
// The core UI lives in WalrusStorageView.vue (also exported for inline embedding in the dashboard).
import { AppHeader, AppFooter, ColorModeControl, useColorMode } from '@meddleware/ui'
import { TipConfigBadge } from '@meddleware/walrus-storage-kit'
import { walrusNetwork, OPERATOR_RELAY_HOSTS } from './config.js'
import WalrusStorageView from './components/WalrusStorageView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/'
const DEV_URL  = import.meta.env.VITE_DEV_URL  || 'https://meddleware.dev/sui/walrus-storage/'
</script>

<template>
  <div class="app">
    <AppHeader variant="dark">
      <template #brand>
        <h1 class="brand-title">Walrus Assets</h1>
      </template>
      <template #actions>
        <TipConfigBadge v-if="walrusNetwork" :host="OPERATOR_RELAY_HOSTS[walrusNetwork]" />
        <ColorModeControl :model-value="mode" @update:model-value="set" />
      </template>
    </AppHeader>

    <main class="app__content">
      <WalrusStorageView />
    </main>

    <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL" />
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Centre the tool at the shared tool-content width when running standalone. The dashboard
   supplies its own width container, so this lives in the shell, not WalrusStorageView. */
.app__content {
  flex: 1;
  width: 100%;
  max-width: var(--mw-tool-content-max);
  margin: 0 auto;
  box-sizing: border-box;
  padding: 1.5rem 1.25rem 4rem;
}

.brand-title {
  font: inherit;
  margin: 0;
}
</style>
