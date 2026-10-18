// Unit tests for env-driven config resolution. The env-reading helpers accept an injectable env bag
// (default: the module's frozen import.meta.env), so each branch is exercised deterministically —
// Vite inlines/freezes import.meta.env at transform time, which makes vi.stubEnv unreliable here.
import { describe, it, expect } from 'vitest'
import { useAccessGate } from '@meddleware/walrus-relay'
import {
  relayHosts,
  uploadRelayMaxTipMist,
  accessGate,
  walruscanBlobUrl,
  DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST,
  PUBLIC_WALRUS_RELAY_HOSTS,
  type EnvSource,
} from '../src/config.js'

describe('walruscanBlobUrl', () => {
  it('builds a network-scoped Walruscan blob URL', () => {
    expect(walruscanBlobUrl('testnet', 'BLOB123')).toBe('https://walruscan.com/testnet/blob/BLOB123')
    expect(walruscanBlobUrl('mainnet', 'BLOB123')).toBe('https://walruscan.com/mainnet/blob/BLOB123')
  })
})

describe('uploadRelayMaxTipMist', () => {
  it('defaults when the env var is unset', () => {
    expect(uploadRelayMaxTipMist({})).toBe(DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST)
  })

  it('uses a valid positive override', () => {
    expect(uploadRelayMaxTipMist({ VITE_UPLOAD_RELAY_MAX_TIP_MIST: '1234567' })).toBe(1234567)
  })

  it('falls back on non-positive or unparseable values', () => {
    expect(uploadRelayMaxTipMist({ VITE_UPLOAD_RELAY_MAX_TIP_MIST: '0' })).toBe(
      DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST,
    )
    expect(uploadRelayMaxTipMist({ VITE_UPLOAD_RELAY_MAX_TIP_MIST: 'nonsense' })).toBe(
      DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST,
    )
  })
})

describe('relayHosts', () => {
  it('returns the public host as fallback for both operator and public when no operator env set', () => {
    const hosts = relayHosts('testnet')
    expect(hosts.public).toBe(PUBLIC_WALRUS_RELAY_HOSTS.testnet)
    // operator defaults to the public host unless VITE_WALRUS_RELAY_TESTNET is set at build time.
    expect(hosts.operator).toBeTruthy()
  })
})

describe('accessGate', () => {
  it('returns null when no gate object id is configured', () => {
    expect(accessGate('testnet', {})).toBeNull()
  })

  it('builds a gate config when a gate id is present (packageId/platformConfigId from the library)', () => {
    const injected: EnvSource = {
      VITE_ACCESS_GATE_ID_TESTNET: '0xgate',
    }
    const gate = accessGate('testnet', injected)
    expect(gate).not.toBeNull()
    expect(gate!.gateId).toBe('0xgate')
    expect('priceMist' in gate!).toBe(false) // the price is read from the chain, never configured
    expect(gate!.nftType).toContain('::access_gate::AccessNFT')
    expect(gate!.packageId).toBeTruthy()
    expect(gate!.platformConfigId).toBeTruthy()
  })

  it('fixes the package and PlatformConfig to the recorded deployment', async () => {
    const { accessGateDeployment } = await import('@meddleware/access-gate-client/deployments')
    const d = accessGateDeployment('testnet')
    const gate = accessGate('testnet', { VITE_ACCESS_GATE_ID_TESTNET: '0xgate' })
    expect(gate).toMatchObject({ packageId: d.publishedAt, platformConfigId: d.platformConfigId })
    expect(gate!.nftType).toBe(`${d.originalId}::access_gate::AccessNFT`)
  })

  it('is ungated on a network without a recorded deployment', () => {
    expect(accessGate('mainnet', { VITE_ACCESS_GATE_ID_MAINNET: '0xgate' })).toBeNull()
  })

  it('marks the NFT type soulbound when the flag is set', () => {
    const gate = accessGate('testnet', {
      VITE_ACCESS_GATE_ID_TESTNET: '0xgate',
      VITE_ACCESS_GATE_SOULBOUND_TESTNET: 'true',
    })
    expect(gate!.soulbound).toBe(true)
    expect(gate!.nftType).toContain('SoulboundAccessNFT')
  })
})

describe('accessGate with useAccessGate', () => {
  const getClient = () => {
    throw new Error('no chain read in this test')
  }

  it('produces a config useAccessGate accepts for its network, with the price left to the chain', () => {
    const gate = accessGate('testnet', { VITE_ACCESS_GATE_ID_TESTNET: '0xgate' })
    const state = useAccessGate({ network: 'testnet', gate, getClient })
    expect(state.gateConfigured).toBe(true)
    expect(state.hasAccess.value).toBeNull() // unknown until checked
    expect(state.terms.value).toBeNull() // read from the chain, not configured
  })

  it('is refused for another network (the config names the published deployment of one)', () => {
    const gate = accessGate('testnet', { VITE_ACCESS_GATE_ID_TESTNET: '0xgate' })
    expect(() => useAccessGate({ network: 'mainnet', gate, getClient })).toThrow()
  })

  it('stays open (no gate) when none is configured', () => {
    const state = useAccessGate({ network: 'testnet', gate: accessGate('testnet', {}), getClient })
    expect(state.gateConfigured).toBe(false)
    expect(state.hasAccess.value).toBe(true)
  })
})
