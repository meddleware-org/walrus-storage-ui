// F12: Extend opens the wallet only for an amount whose cost has been shown. The estimator is a fake
// the test controls.
import { describe, it, expect, vi } from 'vitest'
import { useExtendQuotes } from '../src/composables/useExtendQuotes.js'

describe('useExtendQuotes', () => {
  it('prices an unpriced amount first and does not allow signing yet', async () => {
    const estimate = vi.fn(async (_size: number, epochs: number) => BigInt(epochs) * 1000n)
    const q = useExtendQuotes(estimate)

    expect(await q.shownBeforeSigning('0xblob', 2048, 10)).toBe(false) // seeded default, never priced
    expect(estimate).toHaveBeenCalledWith(2048, 10)
    expect(q.quoteFor('0xblob', 10)).toEqual({ epochs: 10, state: 'ready', costFrost: 10_000n })

    expect(await q.shownBeforeSigning('0xblob', 2048, 10)).toBe(true) // now the cost has been shown
    expect(estimate).toHaveBeenCalledTimes(1)
  })

  it('does not reuse a quote for a different amount', async () => {
    const q = useExtendQuotes(async (_s, epochs) => BigInt(epochs))
    await q.price('0xblob', 1, 10)
    expect(q.quoteFor('0xblob', 25)).toBeNull()
    expect(await q.shownBeforeSigning('0xblob', 1, 25)).toBe(false)
    expect(q.quoteFor('0xblob', 25)?.costFrost).toBe(25n)
  })

  it('reports an unpriceable amount as unavailable, shown, and then lets the wallet decide', async () => {
    const q = useExtendQuotes(async () => null)
    expect(await q.shownBeforeSigning('0xblob', 1, 5)).toBe(false)
    expect(q.quoteFor('0xblob', 5)).toEqual({ epochs: 5, state: 'unavailable', costFrost: null })
    expect(await q.shownBeforeSigning('0xblob', 1, 5)).toBe(true)
  })

  it('treats a throwing estimator as unavailable', async () => {
    const q = useExtendQuotes(async () => {
      throw new Error('rpc down')
    })
    await q.price('0xblob', 1, 5)
    expect(q.quoteFor('0xblob', 5)?.state).toBe('unavailable')
  })

  it('keeps the newest amount when an older request finishes last', async () => {
    const waiting: Array<(v: bigint) => void> = []
    const q = useExtendQuotes(() => new Promise<bigint>((r) => waiting.push(r)))
    const first = q.price('0xblob', 1, 10)
    const second = q.price('0xblob', 1, 20)
    waiting[1]!(2000n)
    waiting[0]!(1000n) // the slow, older amount lands last
    expect(await second).toMatchObject({ epochs: 20 })
    expect(await first).toBeNull()
    expect(q.quoteFor('0xblob', 20)?.costFrost).toBe(2000n)
    expect(q.quoteFor('0xblob', 10)).toBeNull()
    expect(q.pricing.value).toEqual({})
  })

  it('reports an amount that is still being priced', async () => {
    let finish: (v: bigint) => void = () => {}
    const q = useExtendQuotes(() => new Promise<bigint>((r) => (finish = r)))
    const pending = q.price('0xblob', 1, 7)
    expect(q.pricing.value).toEqual({ '0xblob': 7 })
    finish(1n)
    await pending
    expect(q.pricing.value).toEqual({})
  })

  it('forgets a quote after the blob was extended, and drops a request still in flight', async () => {
    const waiting: Array<(v: bigint) => void> = []
    const q = useExtendQuotes(() => new Promise<bigint>((r) => waiting.push(r)))
    const done = q.price('0xblob', 1, 10)
    waiting[0]!(1n)
    await done
    expect(q.quoteFor('0xblob', 10)).not.toBeNull()
    q.clear('0xblob')
    expect(q.quoteFor('0xblob', 10)).toBeNull()

    const late = q.price('0xblob', 1, 10)
    q.clear('0xblob')
    waiting[1]!(5n)
    expect(await late).toBeNull()
    expect(q.quoteFor('0xblob', 10)).toBeNull()
  })
})
