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

// The component's inputs and events.
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

// The furthest-expiring copy represents the group.
const representative = computed(() => props.group.representative)
// The first copy that is uncertified and has a stored certificate, if any.
const certifiable = computed(() => props.group.copies.find((c) => !c.certified && props.pending[c.objectId]) ?? null)
// The group's certification state: certified, pending (certifiable) or none.
const certification = computed<'certified' | 'pending' | 'none'>(() => (props.group.anyCertified ? 'certified' : certifiable.value ? 'pending' : 'none'))
// How many epochs can still be added before the chain's limit.
const maxAddable = computed(() => maxExtendableEpochs(representative.value.endEpoch, props.currentEpoch, props.maxReservation))
// Whether the group expires within the "soon" window.
const expiresSoon = computed(() => props.group.maxEndEpoch - props.currentEpoch < SOON_EPOCHS)
// The per-copy rows, shown only when the group is expanded.
const shownCopies = computed(() => (props.expanded ? props.group.copies : []))
</script>

<template>
  <tr :id="`blob-row-${group.blobId}`" :class="{ highlight: highlighted }" :aria-current="highlighted || undefined">
    <th scope="row">
      <CopyableAddress :address="group.blobId" label="Copy blob ID">
        <ExplorerLink :href="walruscanBlobUrl(network, group.blobId)" :value="group.blobId" :chars="[8, 6]" />
      </CopyableAddress>
      <!-- A toggle to show the copies, when there is more than one. -->
      <UiButton v-if="group.copies.length > 1" class="toggle" variant="link" size="sm" :aria-expanded="expanded" @click="emit('toggle')">
        <span aria-hidden="true">{{ expanded ? '▾' : '▸' }}</span> {{ group.copies.length }} copies
      </UiButton>
    </th>
    <!-- The size is the same across copies of the same content. -->
    <td class="size">{{ formatBytes(group.size) }}</td>
    <td>
      {{ expiryLabel(group.maxEndEpoch, currentEpoch) }}
      <!-- Flag blobs that expire within the "soon" window. -->
      <UiBadge v-if="expiresSoon" tone="warn">Expiring soon</UiBadge>
    </td>
    <td>
      <!-- The certification state is said in words, not only a colour. -->
      <UiBadge v-if="certification === 'certified'" tone="ok">Certified</UiBadge>
      <UiBadge v-else-if="certification === 'pending'" tone="warn">Uploaded, not certified</UiBadge>
      <UiBadge v-else tone="neutral" :symbol="false">Not certified</UiBadge>
    </td>
    <td class="actions">
      <!-- Certify finishes an upload whose certificate is still stored. -->
      <UiButton v-if="certifiable" size="sm" variant="secondary" :disabled="busy !== null" :busy="busy === certifiable.objectId" @click="emit('certify', certifiable)">
        Certify
      </UiButton>
      <!-- Already as far ahead as the chain allows: nothing to extend. -->
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
      <!-- The last action's outcome is announced politely. -->
      <UiLiveStatus label="Result" :message="statuses[representative.objectId] ?? ''" />
    </td>
  </tr>

  <!-- Per-copy detail for grouped duplicates: certify a specific pending copy. -->
  <!-- One row per copy when expanded, so a specific pending copy can be certified. -->
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
/* The routed-to row is tinted with the accent colour. */
.highlight > * {
  background: color-mix(in srgb, var(--accent) 14%, var(--surface));
}
/* Copy rows are smaller and set apart from the group row. */
.copy-row > * {
  background: var(--lift);
  font-size: var(--font-size-xs);
}
/* The actions column keeps room for the extend controls. */
.actions {
  min-width: 14em;
}
/* The toggle sits on its own line under the blob link (the cell does not wrap, so left inline it would spill into the next column), and
 * the two targets stay 24px apart (WCAG 2.5.8). */
.toggle {
  display: flex;
  inline-size: fit-content;
  margin-block-start: var(--space-2xs);
}
/* Muted secondary text. */
.at-max {
  margin: 0;
  color: var(--muted);
  font-size: var(--font-size-sm);
}
</style>
