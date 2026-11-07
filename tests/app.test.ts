// The standalone shell is the shared tool shell: the tool's name as brand and page heading, the relay badge in the header, the
// documentation links and the copyright in the footer.
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const { walrusNetwork } = vi.hoisted(() => ({ walrusNetwork: { value: 'testnet' as 'testnet' | 'mainnet' | null } }))
vi.mock('../src/components/WalrusStorageView.vue', () => ({ default: { template: '<p class="view">view</p>' } }))
vi.mock('../src/config.js', () => ({
  walrusNetwork,
  OPERATOR_RELAY_HOSTS: { testnet: 'https://relay.example.com', mainnet: 'https://relay-main.example.com' },
}))
vi.mock('@meddleware/walrus-storage-kit', () => ({
  TipConfigBadge: { props: ['host'], template: '<span class="badge">{{ host }}</span>' },
}))

import App from '../src/App.vue'

describe('App', () => {
  it('is the tool shell around the view', () => {
    walrusNetwork.value = 'testnet'
    const w = mount(App)
    expect(w.find('h1').text()).toBe('Walrus Assets')
    expect(w.find('header').text()).toContain('Walrus Assets')
    expect(w.find('.view').exists()).toBe(true)
    const hrefs = w.findAll('footer a').map((a) => a.attributes('href'))
    expect(hrefs).toContain('https://docs.meddleware.co.uk/blockchain/sui/walrus-storage/')
    expect(hrefs).toContain('https://meddleware.dev/sui/walrus-storage/')
    expect(w.find('footer').text()).toContain('Meddleware')
  })

  it('shows the relay of the active network in the header', () => {
    walrusNetwork.value = 'mainnet'
    expect(mount(App).find('header .badge').text()).toBe('https://relay-main.example.com')
  })

  it('shows no relay badge where Walrus storage cannot be used', () => {
    walrusNetwork.value = null
    expect(mount(App).find('header .badge').exists()).toBe(false)
  })
})
