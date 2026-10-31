// End-to-end build only (`vite build --mode e2e`; main.ts loads this when MODE is `e2e` and VITE_E2E is `1`, both static, so every other
// build drops it). A mock wallet is registered like an extension, and the owned-blob list is filled in advance (a session cache the app
// reads through `useOwnedBlobs`), so the connected screens can be shown and checked without a network or a funded key. The upload itself
// needs a relay and storage nodes: it is exercised by the localnet spec, not here.
import { MOCK_ADDRESS, installE2eWallet } from '@meddleware/wallet-adapter/testing'
import { browserStorage, pendingCertifyKey, savePendingCertify } from '@meddleware/walrus-storage-client/flow'
import type { OwnedBlob } from '@meddleware/walrus-storage-client'
import { useOwnedBlobs } from './composables/useOwnedBlobs.js'
import { E2E_BLOBS, E2E_EPOCH } from './e2e-data.js'

const hex = (byte: string) => `0x${byte.repeat(32)}`

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

export function installE2e(): void {
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
  savePendingCertify(browserStorage(), pendingCertifyKey('testnet', MOCK_ADDRESS), {
    blobId: E2E_BLOBS.pending,
    blobObjectId: owned[3].objectId,
    certificate: 'ZTJlLWNlcnRpZmljYXRl',
    deletable: true,
  })
  const state = useOwnedBlobs()
  state.blobs.value = owned.sort((a, b) => a.endEpoch - b.endEpoch)
  state.currentEpoch.value = E2E_EPOCH
  state.loadedFor.value = `testnet|${MOCK_ADDRESS}`
}
