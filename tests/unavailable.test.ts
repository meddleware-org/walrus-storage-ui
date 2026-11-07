// Where Walrus storage cannot be used, the view says so in the plain words config.ts decided (D117) and renders no tool: no tabs, no
// wallet prompt, no upload form, and no gate state for a network it cannot serve.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

vi.mock('../src/config.js', async () => {
  const { ref } = await import('vue')
  return {
    network: ref('mainnet'),
    walrusNetwork: ref(null),
    availability: ref({ usable: false, message: 'Walrus storage is not available here right now. Try again later or switch to testnet.', cause: 'VITE_WALRUS_RELAY_MAINNET: host must use https://' }),
    accessGate: vi.fn(() => null),
    relayHosts: vi.fn(),
  }
})
vi.mock('../src/wallet.js', async () => {
  const { ref } = await import('vue')
  return { useWallet: () => ({ account: ref(null) }), getSuiClient: vi.fn(), buildExecutor: vi.fn() }
})
vi.mock('../src/composables/useStorageUpload.js', () => ({ useStorageUpload: () => ({ performUpload: vi.fn(), estimateStorageCost: vi.fn() }) }))
vi.mock('../src/composables/useOwnedBlobs.js', () => ({ useOwnedBlobs: () => ({ load: vi.fn() }) }))

import WalrusStorageView from '../src/components/WalrusStorageView.vue'

describe('WalrusStorageView where Walrus storage cannot be used', () => {
  it('shows the plain message and none of the tool', () => {
    const w = mount(WalrusStorageView)
    expect(w.text()).toContain('Walrus storage is not available here right now. Try again later or switch to testnet.')
    expect(w.text()).not.toMatch(/VITE_|https:\/\//)
    expect(w.find('[role="tablist"]').exists()).toBe(false)
    expect(w.find('input[type="file"]').exists()).toBe(false)
  })
})
