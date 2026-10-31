// BlobGroupRows: what each row shows and offers for a certified, an expiring, a pending and a maxed-out blob.
import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { groupBlobs } from '../src/blob-groups.js'
import BlobGroupRows from '../src/components/BlobGroupRows.vue'

const owned = (objectId: string, blobId: string, over = {}) => ({
  objectId, blobId, size: 4096, startEpoch: 1, endEpoch: 600, certified: true, deletable: false, ...over,
})

function rows(blobs: ReturnType<typeof owned>[], props: Record<string, unknown> = {}) {
  const [group] = groupBlobs(blobs)
  return mount(
    { components: { BlobGroupRows }, props: ['p'], template: '<table><tbody><BlobGroupRows v-bind="p" /></tbody></table>' },
    {
      props: {
        p: {
          group, network: 'testnet', currentEpoch: 560, maxReservation: 53, highlighted: false, expanded: false,
          pending: {}, busy: null, statuses: {}, estimate: async () => 1n, ...props,
        },
      },
    },
  )
}
const texts = (w: ReturnType<typeof mount>) => w.findAll('tr').map((r) => r.text())

describe('BlobGroupRows', () => {
  it('a certified blob shows its size, expiry and certification, and offers Extend', () => {
    const w = rows([owned('0x1', 'A'.repeat(43))])
    const [row] = texts(w)
    expect(row).toContain('4.0 KiB')
    expect(row).toContain('epoch 600 · 40 epochs left')
    expect(row).toContain('Certified')
    expect(row).not.toContain('Expiring soon')
    expect(w.findAll('button').some((b) => b.text() === 'Show cost')).toBe(true)
  })

  it('flags a blob that expires within ten epochs', () => {
    expect(texts(rows([owned('0x1', 'A'.repeat(43), { endEpoch: 565 })]))[0]).toContain('Expiring soon')
  })

  it('offers Certify for an uncertified copy whose certificate is stored, and says it is uncertified either way', () => {
    const blobs = [owned('0xp', 'P'.repeat(43), { certified: false })]
    const withCert = rows(blobs, { pending: { '0xp': { blobId: 'P'.repeat(43), blobObjectId: '0xp', certificate: 'c', deletable: false, savedAt: 0 } } })
    expect(withCert.text()).toContain('Uploaded, not certified')
    expect(withCert.findAll('button').some((b) => b.text() === 'Certify')).toBe(true)
    const without = rows(blobs)
    expect(without.text()).toContain('Not certified')
    expect(without.findAll('button').some((b) => b.text() === 'Certify')).toBe(false)
  })

  it('offers no extension for a blob already as far ahead as the chain allows', () => {
    const w = rows([owned('0x1', 'M'.repeat(43), { endEpoch: 613 })])
    expect(w.text()).toContain('At max lifetime')
    expect(w.findAll('button').some((b) => b.text() === 'Show cost')).toBe(false)
  })

  it('groups re-uploads: one row with a toggle, and a row per copy once expanded', async () => {
    const blobs = [owned('0x1', 'D'.repeat(43), { endEpoch: 600 }), owned('0x2', 'D'.repeat(43), { endEpoch: 590 })]
    const closed = rows(blobs)
    expect(closed.findAll('tr')).toHaveLength(1)
    const toggle = closed.findAll('button').find((b) => b.text().includes('2 copies'))!
    expect(toggle.attributes('aria-expanded')).toBe('false')
    expect(rows(blobs, { expanded: true }).findAll('tr')).toHaveLength(3)
  })

  it('marks the row routed from the duplicate-upload dialog', () => {
    const w = rows([owned('0x1', 'A'.repeat(43))], { highlighted: true })
    expect(w.get('tr').attributes('aria-current')).toBe('true')
  })

  it('disables every action while one runs, and shows a row\'s result', () => {
    const w = rows([owned('0x1', 'A'.repeat(43))], { busy: '0xother', statuses: { '0x1': 'Extended (abcdef12…)' } })
    expect(w.findAll('button').filter((b) => b.text() === 'Show cost').every((b) => b.attributes('disabled') !== undefined)).toBe(true)
    expect(w.get('output[aria-label="Result"]').text()).toBe('Extended (abcdef12…)')
  })
})
