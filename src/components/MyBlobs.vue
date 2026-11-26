<script setup lang="ts">
// The connected wallet's Walrus blobs, one row per blob id, with Extend (add storage) and Certify (finish an upload from its stored
// certificate). This component owns the data and runs the transactions; the rows are `BlobGroupRows`, the amount control `ExtendControl`.
import { computed, nextTick, onMounted, ref, shallowRef, watch } from 'vue'
import { UiButton, UiDataTable, UiEmptyState, UiLiveStatus, UiNotice, UiPanel } from '@meddleware/ui'
import { errorMessage } from '@meddleware/web-utils'
import type { Transaction } from '@mysten/sui/transactions'
import type { OwnedBlob } from '@meddleware/walrus-storage-client'
import { MAX_SINGLE_RESERVATION_EPOCHS } from '@meddleware/walrus-storage-kit'
import {
  browserStorage,
  clearPendingCertify,
  loadPendingCertifies,
  pendingCertifyKey,
  type PendingCertify,
} from '@meddleware/walrus-storage-client/flow'
import type { Executor } from '../wallet.js'
import { walrusNetwork } from '../config.js'
import { walrusClient, walrusLib } from '../walrus.js'
import { useOwnedBlobs } from '../composables/useOwnedBlobs.js'
import { groupBlobs } from '../blob-groups.js'
import BlobGroupRows from './BlobGroupRows.vue'

// Browser storage that never throws (blocked site data falls back to memory for this page).
const storage = browserStorage()

// The component's inputs.
const props = defineProps<{
  /** Connected wallet address whose owned blobs to list; `null` when no wallet is connected. */
  address: string | null
  /** Factory that builds a transaction {@link Executor} bound to the connected wallet. */
  buildExecutor: () => Promise<Executor>
  /** When set, the matching group is expanded + scrolled into view (from the duplicate-upload flow). */
  highlightBlobId?: string | null
}>()

/** The active Walrus network; the view is only rendered on one (WalrusStorageView gates it). */
function currentNetwork(): 'testnet' | 'mainnet' {
  const net = walrusNetwork.value
  if (!net) throw new Error('Walrus storage is not available on this network.')
  return net
}

// Shared, session-persistent cache (survives tab switches and inline re-mounts).
// The shared, session-persistent cache of the wallet's blobs (it survives tab switches and inline re-mounts).
const { blobs, currentEpoch, loading, error, load } = useOwnedBlobs()

// One row per blobId; re-uploads of the same content are collapsed into a group's `copies`.
// One row per blob id.
const groups = computed(() => groupBlobs(blobs.value))
// The groups whose copies are shown.
const expanded = shallowRef<ReadonlySet<string>>(new Set())

// Pending certifications (uploaded-but-not-certified copies we still hold a certificate for).
// Stored certificates of uploaded-but-uncertified copies.
const pending = shallowRef<Record<string, PendingCertify>>({})

// Per-object action state (keyed by Blob objectId), shared by Extend and Certify.
// Which Blob object an action is running for (one at a time), and each row's last outcome.
const busy = ref<string | null>(null)
const statuses = shallowRef<Record<string, string>>({})
// say(objectId, text): record the outcome for one row.
const say = (objectId: string, text: string): void => {
  statuses.value = { ...statuses.value, [objectId]: text }
}

/** toggleExpand(blobId): show or hide a group's copies. */
function toggleExpand(blobId: string): void {
  const next = new Set(expanded.value)
  if (!next.delete(blobId)) next.add(blobId)
  expanded.value = next
}

// refresh(): reload the list, even if it was loaded before.
const refresh = (): Promise<void> => load(props.address, { force: true })

/** Reload the pending map from storage, dropping entries whose blob is already certified. */
/** refreshPending(): reload the stored certificates and drop those whose blob is already certified. */
function refreshPending(): void {
  if (!props.address || !walrusNetwork.value) {
    pending.value = {}
    return
  }
  const key = pendingCertifyKey(walrusNetwork.value, props.address)
  const map = loadPendingCertifies(storage, key)
  for (const blob of blobs.value) {
    if (blob.certified && blob.objectId in map) {
      clearPendingCertify(storage, key, blob.objectId)
      delete map[blob.objectId]
    }
  }
  pending.value = map
}

// Extend adds storage only (no one-time write cost), so the quote prices the `storageCost` component.
/** estimateExtendCost(size, epochs): the storage part of the cost (an extension pays no write cost). */
async function estimateExtendCost(size: number, epochs: number): Promise<bigint | null> {
  const [{ estimateStorageCost }, client] = await Promise.all([walrusLib(), walrusClient(currentNetwork())])
  return (await estimateStorageCost(client, size, epochs)).storageCost
}

/** Build, sign and run one transaction for a blob, reporting each stage on its row and refreshing the list after. */
async function act(blob: OwnedBlob, done: string, build: () => Promise<Transaction>, after?: () => void): Promise<void> {
  // Mark this blob's action as running (all other actions wait).
  busy.value = blob.objectId
  say(blob.objectId, 'Building transaction…')
  try {
    // Build the transaction (this may read the chain).
    const tx = await build()
    // The executor bound to the connected wallet.
    const executor = await props.buildExecutor()
    say(blob.objectId, 'Approve in wallet…')
    // The wallet signs and executes; the digest is reported on the row.
    const { digest } = await executor.signAndExecute(tx)
    // Wait until the chain has indexed the transaction, so the refresh sees its effects.
    await executor.waitForTransaction(digest)
    // Whatever must happen only after success (deleting a used certificate).
    after?.()
    say(blob.objectId, `${done} (${digest.slice(0, 8)}…)`)
    // Reload the list so the row shows the new state.
    await refresh()
  } catch (e) {
    say(blob.objectId, `Failed: ${errorMessage(e)}`)
  } finally {
    busy.value = null
  }
}

/** extendBlob(blob, epochs): add storage; ignored while another action runs. */
function extendBlob(blob: OwnedBlob, epochs: number): Promise<void> {
  if (busy.value) return Promise.resolve()
  return act(blob, 'Extended', async () => {
    const [{ extendBlobLifetimeTransaction }, client] = await Promise.all([walrusLib(), walrusClient(currentNetwork())])
    return extendBlobLifetimeTransaction(client, blob.objectId, { epochs })
  })
}

/** certifyBlob(blob): finish an upload from its stored certificate; the certificate is deleted once it is used. */
function certifyBlob(blob: OwnedBlob): Promise<void> {
  // The stored certificate for this copy.
  const entry = pending.value[blob.objectId]
  const address = props.address
  if (!entry || !address || busy.value) return Promise.resolve()
  return act(
    blob,
    'Certified',
    async () => {
      const [{ certifyBlobTransaction }, client] = await Promise.all([walrusLib(), walrusClient(currentNetwork())])
      return certifyBlobTransaction(client, {
        blobId: entry.blobId,
        blobObjectId: entry.blobObjectId,
        certificate: entry.certificate,
        deletable: entry.deletable,
      })
    },
    () => clearPendingCertify(storage, pendingCertifyKey(currentNetwork(), address), blob.objectId),
  )
}

// Load on first open and whenever the address or network changes; re-derive pending on list/address changes.
// Load on first open and whenever the address or network changes; re-derive the pending certificates on list and address changes.
onMounted(() => {
  void load(props.address)
  refreshPending() // the cached list may already be there (a re-mount), so it will not change
})
watch([() => props.address, walrusNetwork], ([addr]) => {
  void load(addr)
  refreshPending()
})
watch(blobs, refreshPending)

// Highlight + expand the group routed from the duplicate-upload dialog.
watch(
  () => props.highlightBlobId,
  async (blobId) => {
    if (!blobId) return
    expanded.value = new Set(expanded.value).add(blobId)
    await nextTick()
    document.getElementById(`blob-row-${blobId}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  },
  { immediate: true },
)
</script>

<template>
  <UiPanel title="My Blobs" :level="3">
    <p class="bar">
      <UiButton size="sm" variant="secondary" :disabled="!address" :busy="loading" @click="refresh">Refresh</UiButton>
    </p>
    <UiLiveStatus label="Blobs" :message="loading ? 'Loading your blobs…' : ''" />

    <!-- Without a wallet there is nothing to list. -->
    <UiEmptyState v-if="!address">Connect your wallet to list your Walrus blobs.</UiEmptyState>
    <UiNotice v-else-if="error" type="error" :message="error" />
    <!-- The table of blobs, one group per blob id. -->
    <UiDataTable v-else-if="walrusNetwork && (groups.length || !loading)" caption="Your Walrus blobs" empty="No Walrus blobs found for this address." :rows="groups.length">
      <template #head>
        <!-- The column headings. -->
        <th scope="col">Blob ID</th>
        <th scope="col">Size</th>
        <th scope="col">Expires</th>
        <th scope="col">Certified</th>
        <th scope="col">Actions</th>
      </template>
      <!-- One component per group: the group row and its copies. -->
      <BlobGroupRows
        v-for="g in groups"
        :key="g.blobId"
        :group="g"
        :network="walrusNetwork"
        :current-epoch="currentEpoch"
        :max-reservation="MAX_SINGLE_RESERVATION_EPOCHS"
        :highlighted="g.blobId === highlightBlobId"
        :expanded="expanded.has(g.blobId)"
        :pending="pending"
        :busy="busy"
        :statuses="statuses"
        :estimate="estimateExtendCost"
        @toggle="toggleExpand(g.blobId)"
        @extend="extendBlob"
        @certify="certifyBlob"
      />
    </UiDataTable>
  </UiPanel>
</template>

<style scoped>
/* Space under the refresh button. */
.bar {
  margin: 0 0 var(--space-xs);
}
</style>
