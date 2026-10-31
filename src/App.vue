<script setup lang="ts">
// Standalone shell for the Walrus SPA: app header + footer wrapping the core tool view.
// The core UI lives in WalrusStorageView.vue (also exported for inline embedding in the dashboard).
import { AppFooter, AppHeader, ColorModeControl, CopyrightLine, UiAppShell, useColorMode } from '@meddleware/ui'
import { TipConfigBadge } from '@meddleware/walrus-storage-kit'
import { walrusNetwork, OPERATOR_RELAY_HOSTS } from './config.js'
import WalrusStorageView from './components/WalrusStorageView.vue'

const { mode, set } = useColorMode('dark')
const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/'
const DEV_URL = import.meta.env.VITE_DEV_URL || 'https://meddleware.dev/sui/walrus-storage/'
</script>

<template>
  <UiAppShell contained>
    <template #header>
      <AppHeader variant="dark">
        <template #brand>Walrus Assets</template>
        <template #actions>
          <TipConfigBadge v-if="walrusNetwork" :host="OPERATOR_RELAY_HOSTS[walrusNetwork]" />
          <ColorModeControl :model-value="mode" @update:model-value="set" />
        </template>
      </AppHeader>
    </template>

    <h1 class="mw-visually-hidden">Walrus Assets</h1>
    <WalrusStorageView />

    <template #footer>
      <AppFooter :docs-url="DOCS_URL" :dev-url="DEV_URL">
        <CopyrightLine symbol-variant="kopimi" organisation-name="Meddleware" rights-statement="jam" />
      </AppFooter>
    </template>
  </UiAppShell>
</template>
