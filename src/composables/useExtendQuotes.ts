// Prices an Extend before the wallet opens (audit F12). A row's quote is the WAL cost of adding
// `epochs`; Extend opens the wallet only for an amount whose quote the user has been shown. A quote is
// an estimate (labelled `≈`): the wallet and the chain still decide the amount actually paid.
import { ref } from 'vue'

export type ExtendQuote =
  | { epochs: number; state: 'ready'; costFrost: bigint }
  | { epochs: number; state: 'unavailable'; costFrost: null }

/** Cost in FROST of storing `size` bytes for `epochs`, or `null` when it cannot be priced. */
export type EstimateExtendCost = (size: number, epochs: number) => Promise<bigint | null>

export function useExtendQuotes(estimate: EstimateExtendCost) {
  /** Latest quote per Blob object id (one per row). */
  const quotes = ref<Record<string, ExtendQuote>>({})
  const pricing = ref<Record<string, number>>({})
  /** Per-row request counter: an older answer never replaces a newer amount's quote. */
  const tokens: Record<string, number> = {}

  /** Price `epochs` for the row; resolves to its quote, or `null` if a newer request replaced this one. */
  async function price(id: string, size: number, epochs: number): Promise<ExtendQuote | null> {
    const token = (tokens[id] = (tokens[id] ?? 0) + 1)
    pricing.value = { ...pricing.value, [id]: epochs }
    let cost: bigint | null
    try {
      cost = await estimate(size, epochs)
    } catch {
      cost = null
    }
    if (tokens[id] !== token) return null
    const rest = { ...pricing.value }
    delete rest[id]
    pricing.value = rest
    const quote: ExtendQuote =
      cost === null ? { epochs, state: 'unavailable', costFrost: null } : { epochs, state: 'ready', costFrost: cost }
    quotes.value = { ...quotes.value, [id]: quote }
    return quote
  }

  /** The row's quote, only if it is for exactly `epochs` (an older amount's quote is not shown). */
  function quoteFor(id: string, epochs: number | undefined): ExtendQuote | null {
    const q = quotes.value[id]
    return q && q.epochs === epochs ? q : null
  }

  /**
   * Whether Extend may open the wallet now: only when the quote for `epochs` has been shown. If it has
   * not (the seeded default, or a price still loading), it is fetched now, so the user sees the cost
   * and presses Extend again — never a wallet prompt for an unpriced amount.
   */
  async function shownBeforeSigning(id: string, size: number, epochs: number): Promise<boolean> {
    if (quoteFor(id, epochs)) return true
    await price(id, size, epochs)
    return false
  }

  /** Forget the row's quote (after its blob was extended, the next Extend is priced afresh). */
  function clear(id: string): void {
    tokens[id] = (tokens[id] ?? 0) + 1
    const q = { ...quotes.value }
    delete q[id]
    quotes.value = q
    const p = { ...pricing.value }
    delete p[id]
    pricing.value = p
  }

  return { quotes, pricing, price, quoteFor, shownBeforeSigning, clear }
}
