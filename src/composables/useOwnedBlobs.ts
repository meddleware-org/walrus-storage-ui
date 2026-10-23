// Module-singleton cache of the connected wallet's owned Walrus blobs.
//
// State lives at module scope (not inside the composable factory) so it is shared across every
// `MyBlobs` mount in the session: switching the Upload/My-Blobs tabs — or navigating the whole
// tool view in and out inline in the dashboard — no longer loses the list or forces a refetch.
// `load()` is a no-op when the list is already loaded for the given address on the active network,
// unless `force` is set
// (used after an upload/extend, which can create or mutate on-chain blobs).
import { ref } from 'vue'
import type { OwnedBlob } from '@meddleware/walrus-storage-client'
// Lightweight URL import — just the wasm asset URL (does not pull the walrus client eagerly).
import walrusWasmUrl from '@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url'
import { getSuiClient } from '../wallet.js'
import { walrusNetwork } from '../config.js'

const blobs = ref<OwnedBlob[]>([])
const currentEpoch = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
/** `<network>|<address>` the current `blobs` were fetched for; `null` until a successful load. */
const loadedFor = ref<string | null>(null)

/** Counts calls that decide what the list shows; a result is applied only if it is still the latest. */
let latest = 0
/** Key of the load in flight (the latest one), or `null` when none is. */
let inflightKey: string | null = null

/** Drop whatever load is in flight: its result will be discarded and it no longer owns `loading`. */
function supersede(): void {
  latest++
  inflightKey = null
  loading.value = false
}

async function load(address: string | null, opts: { force?: boolean } = {}): Promise<void> {
  const net = walrusNetwork.value
  if (!address || !net) {
    supersede()
    blobs.value = []
    loadedFor.value = null
    return
  }
  // Skip refetch when we already have this address's list and the last load succeeded.
  const key = `${net}|${address}`
  if (!opts.force && loadedFor.value === key && error.value === null) {
    // Switching back to a list we hold: a slower load for another account or network must not land.
    if (inflightKey !== null && inflightKey !== key) supersede()
    return
  }
  if (loadedFor.value !== key) {
    // Never show another network's or wallet's list; and a cleared list must not read as loaded.
    blobs.value = []
    loadedFor.value = null
  }

  const mine = ++latest
  inflightKey = key
  loading.value = true
  error.value = null
  try {
    const { createWalrusClient, fetchOwnedWalrusBlobs } = await import('@meddleware/walrus-storage-client')
    const suiClient = getSuiClient()
    const walrusClient = createWalrusClient({ network: net, wasmUrl: walrusWasmUrl })
    // Blob `endEpoch` is a WALRUS epoch, so compare against the Walrus committee epoch — NOT the
    // Sui system-state epoch (they are different clocks; the Sui epoch, ~1218 vs ~570, made every
    // blob read as "expired").
    const [sys, fetched] = await Promise.all([
      walrusClient.walrus.systemState(),
      fetchOwnedWalrusBlobs(suiClient, walrusClient, address),
    ])
    // A newer load (or a switch) took over while this one was in flight: its answer is for another
    // account or network, so drop it without touching the list, the error or `loading`.
    if (mine !== latest) return
    currentEpoch.value = Number(sys.committee.epoch)
    blobs.value = fetched.sort((a: OwnedBlob, b: OwnedBlob) => a.endEpoch - b.endEpoch)
    loadedFor.value = key
  } catch (e) {
    if (mine !== latest) return
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    if (mine === latest) {
      loading.value = false
      inflightKey = null
    }
  }
}

/** Reactive access to the shared owned-blobs cache and its loader. */
export function useOwnedBlobs() {
  return { blobs, currentEpoch, loading, error, loadedFor, load }
}
