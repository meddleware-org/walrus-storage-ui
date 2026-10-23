// F11: a slower owned-blob load must not overwrite a newer one after the account or network
// switches. The fetches are held open by the test so it controls which one finishes last.
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({ __sui: true }) }))

type Blob = { objectId: string; blobId: string; size: number; endEpoch: number; certified: boolean }
const h = vi.hoisted(() => {
  const pending: Array<{
    address: string
    epoch: number
    resolve: (v: Blob[]) => void
    reject: (e: Error) => void
  }> = []
  return { pending }
})

vi.mock('@meddleware/walrus-storage-client', () => ({
  createWalrusClient: () => ({
    walrus: { systemState: async () => ({ committee: { epoch: 560 } }) },
  }),
  fetchOwnedWalrusBlobs: (_c: unknown, _w: unknown, address: string) =>
    new Promise<Blob[]>((resolve, reject) => {
      h.pending.push({ address, epoch: 0, resolve, reject })
    }),
}))

import { useNetwork } from '@meddleware/wallet-adapter'
import { useOwnedBlobs } from '../src/composables/useOwnedBlobs.js'

const blob = (id: string): Blob => ({ objectId: id, blobId: `blob-${id}`, size: 1, endEpoch: 570, certified: true })
/** Let the dynamic import and the awaited reads inside `load` reach the held fetch. */
const settle = () => new Promise((r) => setTimeout(r, 0))
const request = (address: string) => {
  const r = h.pending.find((p) => p.address === address)
  if (!r) throw new Error(`no fetch started for ${address}`)
  return r
}

describe('useOwnedBlobs stale-result guard', () => {
  beforeEach(async () => {
    h.pending.length = 0
    useNetwork().setNetwork('testnet')
    const s = useOwnedBlobs()
    await s.load(null) // clears the singleton and any in-flight load
    s.error.value = null
  })

  it('drops the earlier account\'s list when it finishes after the later one', async () => {
    const { blobs, loadedFor, loading, load } = useOwnedBlobs()
    const first = load('0xa', { force: true })
    await settle()
    const second = load('0xb', { force: true })
    await settle()
    expect(loading.value).toBe(true)

    request('0xb').resolve([blob('b1')])
    await second
    expect(loadedFor.value).toBe('testnet|0xb')
    expect(loading.value).toBe(false)

    request('0xa').resolve([blob('a1')]) // the slow, earlier request lands last
    await first
    expect(blobs.value.map((b) => b.objectId)).toEqual(['b1'])
    expect(loadedFor.value).toBe('testnet|0xb')
    expect(loading.value).toBe(false)
  })

  it('does not let an earlier load clear `loading` while the newer one is still running', async () => {
    const { blobs, loading, load } = useOwnedBlobs()
    const first = load('0xa', { force: true })
    await settle()
    const second = load('0xb', { force: true })
    await settle()

    request('0xa').resolve([blob('a1')])
    await first
    expect(loading.value).toBe(true) // still waiting for 0xb
    expect(blobs.value).toEqual([])

    request('0xb').resolve([blob('b1')])
    await second
    expect(loading.value).toBe(false)
    expect(blobs.value.map((b) => b.objectId)).toEqual(['b1'])
  })

  it('drops an earlier failure, too', async () => {
    const { error, loadedFor, load } = useOwnedBlobs()
    const first = load('0xa', { force: true })
    await settle()
    const second = load('0xb', { force: true })
    await settle()
    request('0xb').resolve([blob('b1')])
    await second
    request('0xa').reject(new Error('timeout for 0xa'))
    await first
    expect(error.value).toBeNull()
    expect(loadedFor.value).toBe('testnet|0xb')
  })

  it('drops a load that finishes after the wallet disconnected', async () => {
    const { blobs, loadedFor, loading, load } = useOwnedBlobs()
    const inFlight = load('0xa', { force: true })
    await settle()
    await load(null) // disconnect
    expect(loading.value).toBe(false)

    request('0xa').resolve([blob('a1')])
    await inFlight
    expect(blobs.value).toEqual([])
    expect(loadedFor.value).toBeNull()
  })

  it('drops a load that finishes after the network switched', async () => {
    const { blobs, loadedFor, load } = useOwnedBlobs()
    const testnetLoad = load('0xa', { force: true })
    await settle()
    useNetwork().setNetwork('mainnet')
    const mainnetLoad = load('0xa')
    await settle()

    expect(h.pending).toHaveLength(2) // [0] is the testnet request, [1] the mainnet one
    h.pending[1]!.resolve([blob('mainnet')])
    h.pending[0]!.resolve([blob('testnet-late')]) // the slow testnet answer lands last
    await Promise.all([testnetLoad, mainnetLoad])
    expect(loadedFor.value).toBe('mainnet|0xa')
    expect(blobs.value.map((b) => b.objectId)).toEqual(['mainnet'])
  })

  it('switching back to a held list cancels a slower load for the account that was left', async () => {
    const { blobs, loadedFor, loading, load } = useOwnedBlobs()
    const a = load('0xa', { force: true })
    await settle()
    request('0xa').resolve([blob('a1')])
    await a
    expect(loadedFor.value).toBe('testnet|0xa')

    const b = load('0xb') // 0xb's list is requested; 0xa's is dropped from the view
    await settle()
    expect(blobs.value).toEqual([])
    expect(loadedFor.value).toBeNull() // a cleared list must not read as loaded for 0xa

    const again = load('0xa') // back to 0xa: not held any more, so it is fetched again
    await settle()
    h.pending.filter((p) => p.address === '0xa')[1]!.resolve([blob('a2')])
    h.pending.find((p) => p.address === '0xb')!.resolve([blob('b1')])
    await Promise.all([b, again])
    expect(blobs.value.map((x) => x.objectId)).toEqual(['a2'])
    expect(loadedFor.value).toBe('testnet|0xa')
    expect(loading.value).toBe(false)
  })

  it('a same-account cache hit leaves a refresh that is in flight alone', async () => {
    const { blobs, loadedFor, loading, load } = useOwnedBlobs()
    const first = load('0xa')
    await settle()
    request('0xa').resolve([blob('a1')])
    await first

    const refresh = load('0xa', { force: true })
    await settle()
    await load('0xa') // cache hit for the same key
    expect(loading.value).toBe(true)
    h.pending[1]!.resolve([blob('a2')])
    await refresh
    expect(blobs.value.map((b) => b.objectId)).toEqual(['a2'])
    expect(loadedFor.value).toBe('testnet|0xa')
    expect(loading.value).toBe(false)
  })
})
