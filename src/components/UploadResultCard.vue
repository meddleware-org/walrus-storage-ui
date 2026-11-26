<script setup lang="ts">
// What an upload produced: the blob id and its aggregator URL, and the certify transaction when there was one.
// The shared UI components, the link helpers and the upload result type.
import { CopyableAddress, ExplorerLink, UiCard, UiStatGrid, UiStatRow } from '@meddleware/ui'
import { safeHref, suiExplorerUrl, walruscanBlobUrl } from '@meddleware/web-utils'
import type { WalrusNetwork } from '@meddleware/walrus-storage-kit'
import type { UploadResult } from '../composables/useStorageUpload.js'

// The upload result and the network its links point at.
defineProps<{ result: UploadResult; network: WalrusNetwork }>()
</script>

<template>
  <UiCard title="Uploaded" :level="3">
    <!-- A definition list of the three facts. -->
    <UiStatGrid>
      <!-- The blob id, copyable, linking to Walruscan. -->
      <UiStatRow label="Blob ID" align="left">
        <CopyableAddress :address="result.blobId" label="Copy blob ID">
          <ExplorerLink :href="walruscanBlobUrl(network, result.blobId)" :value="result.blobId" :chars="[8, 6]" />
        </CopyableAddress>
      </UiStatRow>
      <!-- The aggregator URL; the address is made safe (http or https only) before it is linked, and the link opens in a new tab without a referrer. -->
      <UiStatRow label="URL" align="left">
        <a class="url" :href="safeHref(result.url)" target="_blank" rel="noopener noreferrer">{{ result.url }}</a>
      </UiStatRow>
      <!-- The certify transaction, when the upload had one. -->
      <UiStatRow v-if="result.digest" label="Certify tx" align="left">
        <CopyableAddress :address="result.digest" label="Copy transaction digest">
          <ExplorerLink :href="suiExplorerUrl('txblock', result.digest, network)" :value="result.digest" :chars="[8, 6]" />
        </CopyableAddress>
      </UiStatRow>
    </UiStatGrid>
  </UiCard>
</template>

<style scoped>
/* Long URLs wrap instead of overflowing the card. */
.url {
  overflow-wrap: anywhere;
}
</style>
