// A failed load is told in plain words (what to do); the technical cause goes to the console (D117).
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../src/wallet.js', () => ({ getSuiClient: () => ({}) }))
vi.mock('@meddleware/walrus-storage-client', () => ({
  createWalrusClient: () => ({ walrus: { systemState: async () => ({ committee: { epoch: 1 } }) } }),
  fetchOwnedWalrusBlobs: async () => {
    throw new Error('14 UNAVAILABLE: upstream connect error or disconnect/reset before headers. reset reason: connection failure')
  },
}))

import { LOAD_FAILED, useOwnedBlobs } from '../src/composables/useOwnedBlobs.js'

afterEach(() => vi.restoreAllMocks())

describe('useOwnedBlobs failure', () => {
  it('shows a plain message and logs the cause', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const { error, load } = useOwnedBlobs()
    await load('0xowner', { force: true })
    expect(error.value).toBe(LOAD_FAILED)
    expect(error.value).not.toMatch(/UNAVAILABLE|upstream|reset/)
    expect(log).toHaveBeenCalledWith('walrus-storage-ui: could not load the owned blobs', expect.objectContaining({ message: expect.stringContaining('UNAVAILABLE') }))
  })
})
