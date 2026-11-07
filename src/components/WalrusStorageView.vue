<script setup lang="ts">
// Core Walrus tool UI (upload + owned-blob management), free of any app shell (header/footer).
// Rendered standalone by walrus-storage-ui's App.vue and inline by the dashboard. Wallet state comes
// from the shared @meddleware/wallet-adapter singleton (via ./wallet.js), so connecting here or
// in any other inline tool view reflects everywhere.
import { computed, ref, watch } from 'vue'
import { AppTabNav, UiButton, UiLiveStatus, UiNotice, UiTabPanel, UiToolIntro, type AppTab } from '@meddleware/ui'
import { WalletGuard } from '@meddleware/wallet-adapter'
import { AccessGateCta, WalrusUpload, useAccessGate, type WalrusNetwork } from '@meddleware/walrus-storage-kit'
import type { ExistingCopy } from '@meddleware/walrus-storage-client/flow'
import { buildExecutor, getSuiClient, useWallet } from '../wallet.js'
import { accessGate, availability, network, relayHosts, walrusNetwork } from '../config.js'
import { useOwnedBlobs } from '../composables/useOwnedBlobs.js'
import { useStorageUpload, type UploadResult } from '../composables/useStorageUpload.js'
import MyBlobs from './MyBlobs.vue'
import UploadResultCard from './UploadResultCard.vue'

const TABS: AppTab[] = [
  { id: 'upload', label: 'Upload' },
  { id: 'blobs', label: 'My Blobs' },
]
const activeTab = ref<string>('upload')

const { account } = useWallet()

// One access-gate state per Walrus network (the gate is a per-network setting), created when its network is first the active one and
// inert until an ownership check runs. `useAccessGate` throws for a gate that is not the published deployment on its network;
// `accessGate()` only returns such configs (or null, ungated). The shared client serves the active network only, so a state for
// another network refuses to read rather than reading the wrong chain.
const gateStates: Partial<Record<WalrusNetwork, ReturnType<typeof useAccessGate>>> = {}
function gateFor(net: WalrusNetwork) {
  return (gateStates[net] ??= useAccessGate({
    network: net,
    gate: accessGate(net),
    getClient: () => {
      if (net !== network.value) throw new Error(`No Sui client for ${net} while ${network.value} is active.`)
      return getSuiClient()
    },
  }))
}
/** The active network's gate state (testnet's while the view is hidden on a non-Walrus network). */
const gateState = computed(() => gateFor(walrusNetwork.value ?? 'testnet'))
const purchasing = ref(false)
const result = ref<UploadResult | null>(null)
/** A gate is configured and the ownership check has not decided yet. */
const checkingAccess = computed(() => gateState.value.gateConfigured && gateState.value.hasAccess.value === null)
const needsPass = computed(() => gateState.value.gateConfigured && gateState.value.hasAccess.value === false)

// Check gate ownership whenever the connected account or the network changes. A switched or disconnected wallet never inherits the
// previous wallet's access state: `reset()` also discards any in-flight check.
watch(
  [() => account.value?.address ?? null, walrusNetwork],
  ([addr], previous) => {
    const prevAddr = previous?.[0] ?? null
    if (addr !== prevAddr) for (const s of Object.values(gateStates)) s.reset()
    else gateState.value.reset()
    result.value = null
    if (addr && walrusNetwork.value && gateState.value.gate) void gateState.value.checkOwnership(addr)
  },
  { immediate: true },
)

async function onPurchase(): Promise<void> {
  if (!account.value) return
  purchasing.value = true
  try {
    await gateState.value.purchase(await buildExecutor(), account.value.address)
  } catch {
    // The reason is published in `purchaseError` and shown by the prompt.
  } finally {
    purchasing.value = false
  }
}

const { performUpload, estimateStorageCost } = useStorageUpload(() => gateState.value)
const ownedBlobs = useOwnedBlobs()

// The user declined a duplicate upload and chose to manage the existing copy: jump to My Blobs and
// highlight it (the grouped row exposes Extend for certified, Certify for pending).
const highlightBlobId = ref<string | null>(null)
function onManageExisting(existing: ExistingCopy): void {
  highlightBlobId.value = existing.blobId
  activeTab.value = 'blobs'
}

// Fires after every upload attempt (success or failure): a failed run may still have landed on-chain, so force-refresh the
// owned-blobs cache and NFT ownership (uses remaining) in the background regardless of outcome.
function onSettled(): void {
  if (!account.value) return
  void ownedBlobs.load(account.value.address, { force: true })
  if (gateState.value.gate) void gateState.value.checkOwnership(account.value.address)
}
</script>

<template>
  <section aria-labelledby="walrus-title">
    <h2 id="walrus-title">Walrus storage</h2>
    <UiToolIntro>Upload and manage blobs on Walrus decentralised storage ({{ network }}).</UiToolIntro>

    <UiNotice v-if="!walrusNetwork" type="info" :message="availability.message ?? ''" />
    <template v-else>
      <AppTabNav v-model="activeTab" :tabs="TABS" id-prefix="walrus" aria-label="Feature tabs" />

      <!-- The tab list and its panel always render (the selected tab controls a live panel); the wallet
           prompt replaces only the panel's content until a wallet is connected. -->
      <UiTabPanel id-prefix="walrus" :tab="activeTab">
        <WalletGuard message="Connect a Sui wallet to upload and manage your blobs.">
          <template v-if="activeTab === 'upload'">
            <UiLiveStatus label="Access pass" :message="checkingAccess ? 'Checking access…' : ''" />

            <!-- Gated + no access: replace the form with the purchase prompt, so the person is guided to buy first rather than
                 facing a disabled form. -->
            <template v-if="needsPass">
              <AccessGateCta
                :gate-configured="gateState.gateConfigured"
                :has-access="gateState.hasAccess.value"
                :busy="purchasing"
                :terms="gateState.terms.value"
                :terms-error="gateState.termsError.value"
                :purchase-error="gateState.purchaseError.value"
                @purchase="onPurchase"
              />
              <UiButton v-if="gateState.termsError.value && !gateState.termsLoading.value" variant="secondary" @click="gateState.loadTerms()">
                Read the price again
              </UiButton>
            </template>

            <!-- Access held (or ungated relay): the upload form. -->
            <template v-else-if="!checkingAccess">
              <!-- Gated relays spend a credit before the file is stored: say that it pays for an attempt, not a guarantee, and
                   that attempts resume. -->
              <UiNotice v-if="gateState.gateConfigured" type="info">
                Uploading spends <strong>one credit</strong> from your access NFT (an on-chain step) before the file is stored — it pays
                for an upload <em>attempt</em>, not a guaranteed upload. Your attempt resumes automatically, even after a page reload if
                you re-select the same file, so a credit is normally not lost. A credit is spent without a completed upload only if you
                abandon the upload entirely, cancel a required wallet approval, or wait long enough that the reserved storage lapses.
              </UiNotice>

              <WalrusUpload
                :hosts="relayHosts(walrusNetwork)"
                :connected="!!account"
                :access="{ gateConfigured: gateState.gateConfigured, hasAccess: gateState.hasAccess, singleUse: gateState.singleUse }"
                :session-key="`${walrusNetwork}:${account?.address ?? ''}`"
                :perform-upload="performUpload"
                :estimate-storage-cost="estimateStorageCost"
                @uploaded="result = $event"
                @settled="onSettled"
                @manage-existing="onManageExisting"
              />

              <UploadResultCard v-if="result" :result="result" :network="walrusNetwork" />
            </template>
          </template>

          <MyBlobs v-else :address="account?.address ?? null" :build-executor="buildExecutor" :highlight-blob-id="highlightBlobId" />
        </WalletGuard>
      </UiTabPanel>
    </template>
  </section>
</template>
