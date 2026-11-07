// What a person reads when Walrus storage cannot be used: plain words; the networks to switch to are passed in (config.ts decides them
// from the deployment records and the relay hosts).
import { describe, expect, it } from 'vitest'
import { notAvailableNow, notAvailableOn } from '../src/availability.js'

describe('availability messages', () => {
  it('offer the networks that can be used', () => {
    expect(notAvailableOn('localnet', ['testnet', 'mainnet'])).toBe('Walrus storage is not available on localnet. Switch to testnet or mainnet.')
    expect(notAvailableOn('mainnet', ['testnet'])).toBe('Walrus storage is not available on mainnet. Switch to testnet.')
    expect(notAvailableNow(['testnet'])).toBe('Walrus storage is not available here right now. Try again later or switch to testnet.')
  })

  it('drop the suggestion where no network can be used', () => {
    expect(notAvailableOn('testnet', [])).toBe('Walrus storage is not available on testnet.')
    expect(notAvailableNow([])).toBe('Walrus storage is not available here right now. Try again later.')
  })
})
