<script setup lang="ts">
// Standalone shell for the Walrus SPA: the shared tool shell (header, colour mode, footer) around the core tool view.
// The core UI lives in WalrusStorageView.vue (also exported for inline embedding in the dashboard).
import { computed } from 'vue'
import { AppToolShell } from '@meddleware/ui'
import { TipConfigBadge } from '@meddleware/walrus-storage-kit'
import { walrusNetwork, OPERATOR_RELAY_HOSTS } from './config.js'
import WalrusStorageView from './components/WalrusStorageView.vue'

/** The relay of the active network (the badge shows whether it is up and what it tips); none where Walrus storage cannot be used. */
const relayHost = computed(() => (walrusNetwork.value ? OPERATOR_RELAY_HOSTS[walrusNetwork.value] : null))
const DOCS_URL = import.meta.env.VITE_DOCS_URL || undefined
const DEV_URL = import.meta.env.VITE_DEV_URL || undefined
</script>

<template>
  <AppToolShell title="Walrus Assets" slug="walrus-storage" :docs-url="DOCS_URL" :dev-url="DEV_URL">
    <template #actions>
      <TipConfigBadge v-if="relayHost" :host="relayHost" />
    </template>

    <WalrusStorageView />
  </AppToolShell>
</template>
