// Unit tests for env-driven config resolution. The env-reading helpers accept an injectable env bag
// (default: the module's frozen import.meta.env), so each branch is exercised deterministically —
// Vite inlines/freezes import.meta.env at transform time, which makes vi.stubEnv unreliable here.
import { describe, it, expect } from 'vitest'
import { PUBLIC_WALRUS_RELAY_HOSTS, useAccessGate } from '@meddleware/walrus-storage-kit'
import {
  availabilityOf,
  relayHosts,
  uploadRelayMaxTipMist,
  accessGate,
  DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST,
  type EnvSource,
} from '../src/config.js'

describe('uploadRelayMaxTipMist', () => {
  it('defaults when the env var is unset', () => {
    expect(uploadRelayMaxTipMist({})).toBe(DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST)
  })

  it('defaults to the workspace ceiling of 0.005 SUI (D2, re-derived under D57)', () => {
    expect(DEFAULT_UPLOAD_RELAY_MAX_TIP_MIST).toBe(5_000_000)
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

describe('availabilityOf', () => {
  // A gate id of the right shape; whether it is a gate is the chain's to say.
  const GATE = `0x${'a'.repeat(64)}`

  it('is usable on testnet and mainnet with nothing set (the public relay, ungated)', () => {
    expect(availabilityOf('testnet', {})).toEqual({ usable: true, message: null, cause: null })
    expect(availabilityOf('mainnet', {})).toEqual({ usable: true, message: null, cause: null })
  })

  it('is not offered where Walrus has no network, and offers the networks that work', () => {
    const a = availabilityOf('localnet', {})
    expect(a.usable).toBe(false)
    expect(a.message).toBe('Walrus storage is not available on localnet. Switch to testnet or mainnet.')
    expect(a.cause).toBeNull() // nothing is wrong
  })

  it('a gate configured where no access_gate deployment is recorded is not offered (never silently ungated); the cause names the setting', () => {
    const a = availabilityOf('mainnet', { VITE_ACCESS_GATE_ID_MAINNET: GATE })
    expect(a).toEqual({
      usable: false,
      message: 'Walrus storage is not available on mainnet. Switch to testnet.',
      cause: 'VITE_ACCESS_GATE_ID_MAINNET is set but no access_gate deployment is recorded for mainnet',
    })
  })

  it('a gate id that is not an object id is a fault: "not available right now", the setting only in the cause', () => {
    const a = availabilityOf('testnet', { VITE_ACCESS_GATE_ID_TESTNET: '0xgate' })
    expect(a.usable).toBe(false)
    expect(a.message).toBe('Walrus storage is not available here right now. Try again later or switch to mainnet.')
    expect(a.cause).toContain('VITE_ACCESS_GATE_ID_TESTNET')
  })

  it('a valid gate id on a network with a deployment is usable', () => {
    expect(availabilityOf('testnet', { VITE_ACCESS_GATE_ID_TESTNET: GATE }).usable).toBe(true)
  })

  it('a relay host that is not https is a fault the person reads as "right now"; the cause names the setting and the value', () => {
    const a = availabilityOf('mainnet', { VITE_WALRUS_RELAY_MAINNET: 'http://relay.example.com' })
    expect(a.usable).toBe(false)
    expect(a.message).toBe('Walrus storage is not available here right now. Try again later or switch to testnet.')
    expect(a.cause).toContain('VITE_WALRUS_RELAY_MAINNET')
    expect(a.cause).toContain('http://relay.example.com')
  })

  it('an unparseable relay host is a fault too, and a loopback http host is allowed', () => {
    expect(availabilityOf('testnet', { VITE_WALRUS_RELAY_TESTNET: 'not a url' }).usable).toBe(false)
    expect(availabilityOf('testnet', { VITE_WALRUS_RELAY_TESTNET: 'http://localhost:3000' }).usable).toBe(true)
  })

  it('never names a setting, a record or "operator" to the person', () => {
    const texts = [
      availabilityOf('localnet', {}).message,
      availabilityOf('mainnet', { VITE_ACCESS_GATE_ID_MAINNET: GATE }).message,
      availabilityOf('testnet', { VITE_ACCESS_GATE_ID_TESTNET: 'x' }).message,
      availabilityOf('testnet', { VITE_WALRUS_RELAY_TESTNET: 'http://x.example' }).message,
    ]
    for (const text of texts) expect(text).not.toMatch(/VITE_|operator|deployment|access_gate|configur|https/i)
  })
})
