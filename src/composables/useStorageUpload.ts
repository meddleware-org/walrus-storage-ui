// The Upload tab's orchestration: wires the shared `WalrusUpload` widget to walrus-storage-client's upload flow and the wallet.
// `runBlobUpload` registers fresh on every attempt (the relay rejects an old register transaction); for a gated relay `useGatedUpload`
// keeps the single-use consume resumable (its digest is persisted before the upload, reused after an interruption, cleared once the
// upload lands, and replaced only after the gateway reports it redeemed).
import { useGatedUpload, type AccessGateState } from '@meddleware/walrus-storage-kit'
import {
  browserStorage,
  clearPendingCertify,
  loadPendingCertifies,
  pendingCertifyKey,
  runBlobUpload,
  savePendingCertify,
  type BlobUploadResult,
  type ExistingCopy,
  type UploadProgress,
} from '@meddleware/walrus-storage-client/flow'
import { availability, relayHosts, uploadRelayMaxTipMist, walrusNetwork } from '../config.js'
import { buildExecutor, getSuiClient, useWallet } from '../wallet.js'
import { walrusClient, walrusLib, walrusWasmUrl } from '../walrus.js'

/** What an upload produced (the client's result). */
export type UploadResult = BlobUploadResult

/** What the upload widget asks for. */
export interface UploadOptions {
  /** The relay to upload through. */
  relayHost: string
  /** How many storage epochs to reserve. */
  epochs: number
  /** Upload even when the wallet already owns this exact blob. */
  force?: boolean
  /** Whether the Blob object can be deleted by its owner. */
  deletable?: boolean
  /** Progress reports for the widget. */
  onStatus: (s: string | UploadProgress) => void
}

/** `gate` is the active network's access-gate state (a getter: it changes with the network). */
/** The Upload tab's two injected functions: perform an upload, and price a reservation. */
export function useStorageUpload(gate: () => AccessGateState) {
  // Browser storage that never throws (blocked site data falls back to memory for this page).
  const storage = browserStorage()
  const { account, signPersonalMessage } = useWallet()
  const { accessFor } = useGatedUpload(gate)

  /**
   * Precheck (before paying to register): does the wallet already own this exact blob? Returns a `certified` match (offer Extend) or a
   * `pending` one: uncertified but with a saved certificate (offer Certify). Best-effort: any failure returns null so the upload proceeds.
   */
  async function findExistingCopy(blobId: string): Promise<ExistingCopy | null> {
    const address = account.value?.address
    const net = walrusNetwork.value
    if (!address || !net) return null
    try {
      const [{ fetchOwnedWalrusBlobs }, client] = await Promise.all([walrusLib(), walrusClient(net)])
      const [sys, owned] = await Promise.all([client.walrus.systemState(), fetchOwnedWalrusBlobs(getSuiClient(), client, address)])
      const currentEpoch = Number(sys.committee.epoch)
      const copies = owned.filter((b) => b.blobId === blobId && b.endEpoch > currentEpoch)
      const certified = copies.find((b) => b.certified)
      if (certified) return { kind: 'certified', blobId, objectId: certified.objectId, endEpoch: certified.endEpoch }
      const store = loadPendingCertifies(storage, pendingCertifyKey(net, address))
      const pending = copies.find((b) => !b.certified && b.objectId in store)
      return pending ? { kind: 'pending', blobId, objectId: pending.objectId, endEpoch: pending.endEpoch } : null
    } catch {
      return null
    }
  }

  /** Register fresh, upload through the relay and certify (for a gated relay, spending an access credit first). */
  async function performUpload(bytes: Uint8Array, opts: UploadOptions): Promise<UploadResult> {
    if (!account.value) throw new Error('Connect your wallet first.')
    const net = walrusNetwork.value
    if (!net) throw new Error(availability.value.message ?? 'Walrus storage is not available here.')
    const executor = await buildExecutor()
    const address = account.value.address
    const access = accessFor({
      relayHost: opts.relayHost,
      publicHost: relayHosts(net).public,
      address,
      network: net,
      executor,
      sign: signPersonalMessage,
      onStatus: opts.onStatus,
      storage,
    })
    return runBlobUpload({
      bytes,
      network: net,
      relayHost: opts.relayHost,
      address,
      wasmUrl: walrusWasmUrl,
      maxTipMist: uploadRelayMaxTipMist(),
      epochs: opts.epochs,
      deletable: opts.deletable,
      force: opts.force,
      findExistingCopy,
      executor,
      suiClient: getSuiClient(),
      access,
      onStatus: opts.onStatus,
      // Persist the certificate the moment the upload lands, and drop it once certified, so a dismissed certify can be finished
      // from My Blobs after a tab switch or reload.
      onUploaded: (info) => savePendingCertify(storage, pendingCertifyKey(net, address), info),
      onCertified: (blobObjectId) => clearPendingCertify(storage, pendingCertifyKey(net, address), blobObjectId),
    })
  }

  // Injected into the upload widget so it can price a chosen reservation duration (storage is WAL, billed per size × epochs).
  /** Price storing `sizeBytes` for `epochs`, in FROST, or `null` when it cannot be priced. */
  async function estimateStorageCost(sizeBytes: number, epochs: number): Promise<bigint | null> {
    const net = walrusNetwork.value
    if (!net) return null
    try {
      const [{ estimateStorageCost: estimate }, client] = await Promise.all([walrusLib(), walrusClient(net)])
      return (await estimate(client, sizeBytes, epochs)).totalCost
    } catch {
      return null
    }
  }

  return { performUpload, estimateStorageCost }
}
