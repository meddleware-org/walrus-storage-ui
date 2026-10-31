<script setup lang="ts">
// One blob's rows in the My Blobs table: the group row (re-uploads of the same content are collapsed into it), and, when expanded, one
// row per underlying copy so a specific pending copy can be certified. Presentational: the parent owns the data and runs the actions.
import { computed } from 'vue'
import { CopyableAddress, ExplorerLink, UiBadge, UiButton, UiLiveStatus } from '@meddleware/ui'
import { formatBytes, truncateMiddle, walruscanBlobUrl } from '@meddleware/web-utils'
import type { WalrusNetwork } from '@meddleware/walrus-storage-kit'
import type { OwnedBlob } from '@meddleware/walrus-storage-client'
import type { PendingCertify } from '@meddleware/walrus-storage-client/flow'
import { expiryLabel, maxExtendableEpochs, type BlobGroup } from '../blob-groups.js'
import type { EstimateExtendCost } from '../composables/useExtendQuotes.js'
import ExtendControl from './ExtendControl.vue'

/** Expiring within this many epochs is flagged. */
const SOON_EPOCHS = 10

const props = defineProps<{
  group: BlobGroup
  network: WalrusNetwork
  currentEpoch: number
  /** The longest reservation the chain allows (epochs ahead). */
  maxReservation: number
  /** Routed here from the duplicate-upload dialog. */
  highlighted: boolean
  expanded: boolean
  /** Stored certificates of uploaded-but-uncertified copies, by Blob object id. */
  pending: Record<string, PendingCertify>
  /** The Blob object id whose action is running, or null. */
  busy: string | null
  /** The last action's outcome, by Blob object id. */
  statuses: Record<string, string>
  estimate: EstimateExtendCost
}>()
const emit = defineEmits<{ toggle: []; extend: [blob: OwnedBlob, epochs: number]; certify: [blob: OwnedBlob] }>()

const representative = computed(() => props.group.representative)
const certifiable = computed(() => props.group.copies.find((c) => !c.certified && props.pending[c.objectId]) ?? null)
const certification = computed<'certified' | 'pending' | 'none'>(() => (props.group.anyCertified ? 'certified' : certifiable.value ? 'pending' : 'none'))
const maxAddable = computed(() => maxExtendableEpochs(representative.value.endEpoch, props.currentEpoch, props.maxReservation))
const expiresSoon = computed(() => props.group.maxEndEpoch - props.currentEpoch < SOON_EPOCHS)
const shownCopies = computed(() => (props.expanded ? props.group.copies : []))
</script>

<template>
  <tr :id="`blob-row-${group.blobId}`" :class="{ highlight: highlighted }" :aria-current="highlighted || undefined">
    <th scope="row">
      <CopyableAddress :address="group.blobId" label="Copy blob ID">
        <ExplorerLink :href="walruscanBlobUrl(network, group.blobId)" :value="group.blobId" :chars="[8, 6]" />
      </CopyableAddress>
      <UiButton v-if="group.copies.length > 1" class="toggle" variant="link" size="sm" :aria-expanded="expanded" @click="emit('toggle')">
        <span aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span> {{ group.copies.length }} copies
      </UiButton>
    </th>
    <td class="size">{{ formatBytes(group.size) }}</td>
    <td>
      {{ expiryLabel(group.maxEndEpoch, currentEpoch) }}
      <UiBadge v-if="expiresSoon" tone="warn">Expiring soon</UiBadge>
    </td>
    <td>
      <UiBadge v-if="certification === 'certified'" tone="ok">Certified</UiBadge>
      <UiBadge v-else-if="certification === 'pending'" tone="warn">Uploaded, not certified</UiBadge>
      <UiBadge v-else tone="neutral" :symbol="false">Not certified</UiBadge>
    </td>
    <td class="actions">
      <UiButton v-if="certifiable" size="sm" variant="secondary" :disabled="busy !== null" :busy="busy === certifiable.objectId" @click="emit('certify', certifiable)">
        Certify
      </UiButton>
      <p v-if="maxAddable === 0" class="at-max">At max lifetime</p>
      <ExtendControl
        v-else
        :blob="representative"
        :max="maxAddable"
        :disabled="busy !== null"
        :busy="busy === representative.objectId"
        :estimate="estimate"
        @extend="(epochs) => emit('extend', representative, epochs)"
      />
      <UiLiveStatus label="Result" :message="statuses[representative.objectId] ?? ''" />
    </td>
  </tr>

  <!-- Per-copy detail for grouped duplicates: certify a specific pending copy. -->
  <tr v-for="c in shownCopies" :key="c.objectId" class="copy-row">
    <th scope="row">
      <CopyableAddress :address="c.objectId" label="Copy object ID">{{ truncateMiddle(c.objectId, [10, 0]) }}</CopyableAddress>
    </th>
    <td></td>
    <td>{{ expiryLabel(c.endEpoch, currentEpoch) }}</td>
    <td>
      <UiBadge v-if="c.certified" tone="ok">Certified</UiBadge>
      <UiBadge v-else-if="pending[c.objectId]" tone="warn">Uploaded, not certified</UiBadge>
      <UiBadge v-else tone="neutral" :symbol="false">Not certified</UiBadge>
    </td>
    <td class="actions">
      <UiButton v-if="!c.certified && pending[c.objectId]" size="sm" variant="secondary" :disabled="busy !== null" :busy="busy === c.objectId" @click="emit('certify', c)">
        Certify
      </UiButton>
      <UiLiveStatus label="Result" :message="statuses[c.objectId] ?? ''" />
    </td>
  </tr>
</template>

<style scoped>
/* A truncated id and a size stay on one line each; the table scrolls inside its own box when the screen is narrower. */
th {
  white-space: nowrap;
}
.size {
  white-space: nowrap;
}
.highlight > * {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
}
.copy-row > * {
  background: var(--lift);
  font-size: var(--font-size-xs);
}
.actions {
  min-width: 14em;
}
/* When the cell is narrow the toggle wraps under the blob link: keep the two targets 24px apart (WCAG 2.5.8). */
.toggle {
  margin-block-start: var(--space-2xs);
}
.at-max {
  margin: 0;
  color: var(--muted);
  font-size: var(--font-size-sm);
}
</style>
