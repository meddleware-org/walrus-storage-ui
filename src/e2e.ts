// End-to-end build only (`vite build --mode e2e`; main.ts loads this when MODE is `e2e` and VITE_E2E is `1`, both static, so every other
// build drops it). A mock wallet is registered like an extension, and the owned-blob list is filled in advance (a session cache the app
// reads through `useOwnedBlobs`), so the connected screens can be shown and checked without a network or a funded key. The upload itself
// needs a relay and storage nodes: it is exercised by the localnet spec, not here.
import { MOCK_ADDRESS, installE2eWallet } from '@meddleware/wallet-adapter/testing'
import { browserStorage, pendingCertifyKey, savePendingCertify } from '@meddleware/walrus-storage-client/flow'
import type { OwnedBlob } from '@meddleware/walrus-storage-client'
import { useOwnedBlobs } from './composables/useOwnedBlobs.js'
import { E2E_BLOBS, E2E_EPOCH } from './e2e-data.js'

// hex(byte): a 32-byte object id made of one repeated byte.
const hex = (byte: string) => `0x${byte.repeat(32)}`

// blob(n, id, over): an owned blob with defaults the cases override.
const blob = (n: number, blobId: string, over: Partial<OwnedBlob>): OwnedBlob => ({
  objectId: hex(n.toString(16).padStart(2, '0')),
  blobId,
  size: 48 * 1024,
  startEpoch: 540,
  endEpoch: 600,
  certified: true,
  deletable: false,
  ...over,
})

/** Register the mock wallet and fill the owned-blob cache with five blobs, one of them uploaded but not certified. */
export function installE2e(): void {
  // `?first-visit`: the page as a first-time visitor gets it (no wallet, nothing seeded), for the storage check (e2e/storage.spec.ts).
  if (new URLSearchParams(location.search).has('first-visit')) return
  installE2eWallet()
  const owned = [
    // Re-uploads of the same content collapse into one row with two copies; the nearer one is about to expire.
    blob(1, E2E_BLOBS.duplicated, { endEpoch: 565 }),
    blob(2, E2E_BLOBS.duplicated, { endEpoch: 566, size: 48 * 1024 }),
    blob(3, E2E_BLOBS.steady, { endEpoch: 600, size: 3 * 1024 * 1024 }),
    // Uploaded but not certified, with the certificate still stored: Certify is offered.
    blob(4, E2E_BLOBS.pending, { endEpoch: 580, certified: false, deletable: true }),
    // Already as far ahead as the chain allows: nothing to extend.
    blob(5, E2E_BLOBS.maxed, { endEpoch: 613, size: 512 }),
  ]
  // The stored certificate that makes Certify available for the uncertified blob.
  savePendingCertify(browserStorage(), pendingCertifyKey('testnet', MOCK_ADDRESS), {
    blobId: E2E_BLOBS.pending,
    blobObjectId: owned[3].objectId,
    certificate: 'ZTJlLWNlcnRpZmljYXRl',
    deletable: true,
  })
  // Fill the shared cache, sorted as the app sorts it, as if the list had been loaded for the mock account.
  const state = useOwnedBlobs()
  state.blobs.value = owned.sort((a, b) => a.endEpoch - b.endEpoch)
  state.currentEpoch.value = E2E_EPOCH
  state.loadedFor.value = `testnet|${MOCK_ADDRESS}`
}
