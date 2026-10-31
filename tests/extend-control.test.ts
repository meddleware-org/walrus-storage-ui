// ExtendControl: the amount is clamped to what the chain allows, the first press prices it, and only a second press (the cost having been
// shown) asks to extend.
import { describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ExtendControl from '../src/components/ExtendControl.vue'

const blob = { objectId: '0xblob', blobId: 'B'.repeat(43), size: 2048, startEpoch: 1, endEpoch: 580, certified: true, deletable: false }

function control(over: { max?: number; estimate?: (size: number, epochs: number) => Promise<bigint | null>; disabled?: boolean } = {}) {
  const estimate = vi.fn(over.estimate ?? (async (_size: number, epochs: number) => BigInt(epochs) * 1_000_000_000n))
  const wrapper = mount(ExtendControl, { props: { blob, max: over.max ?? 33, disabled: over.disabled ?? false, busy: false, estimate } })
  return { wrapper, estimate }
}
const press = async (w: ReturnType<typeof mount>, name: string) => {
  await w.findAll('button').find((b) => b.text() === name)!.trigger('click')
  await flushPromises()
}

describe('ExtendControl', () => {
  it('starts at +10 and never above what can still be added', () => {
    expect(control().wrapper.get('input').element.value).toBe('10')
    expect(control({ max: 4 }).wrapper.get('input').element.value).toBe('4')
  })

  it('clamps a typed amount to 1..max and prices the clamped amount', async () => {
    const { wrapper, estimate } = control({ max: 33 })
    await wrapper.get('input').setValue('500')
    await flushPromises()
    expect(wrapper.get('input').element.value).toBe('33')
    expect(estimate).toHaveBeenLastCalledWith(2048, 33)
    expect(wrapper.get('output').text()).toBe('≈33.0000 WAL for +33 epochs')
  })

  it('the presets set and price an amount', async () => {
    const { wrapper, estimate } = control({ max: 33 })
    await press(wrapper, '+25')
    expect(wrapper.get('input').element.value).toBe('25')
    expect(estimate).toHaveBeenLastCalledWith(2048, 25)
    await press(wrapper, 'Max')
    expect(wrapper.get('input').element.value).toBe('33')
  })

  it('does not ask to extend until the cost has been shown', async () => {
    const { wrapper } = control()
    expect(wrapper.findAll('button').some((b) => b.text() === 'Show cost')).toBe(true)
    await press(wrapper, 'Show cost')
    expect(wrapper.emitted('extend')).toBeUndefined()
    expect(wrapper.get('output').text()).toBe('≈10.0000 WAL for +10 epochs')
    await press(wrapper, 'Extend')
    expect(wrapper.emitted('extend')).toEqual([[10]])
  })

  it('says so when the price cannot be read, and then lets the wallet decide', async () => {
    const { wrapper } = control({ estimate: async () => null })
    await press(wrapper, 'Show cost')
    expect(wrapper.get('output').text()).toBe('price unavailable')
    await press(wrapper, 'Extend')
    expect(wrapper.emitted('extend')).toEqual([[10]])
  })

  it('asks for nothing while another action runs', async () => {
    const { wrapper } = control({ disabled: true })
    await press(wrapper, 'Show cost')
    expect(wrapper.emitted('extend')).toBeUndefined()
  })

  it('forgets the quote when the blob was extended', async () => {
    const { wrapper } = control()
    await press(wrapper, 'Show cost')
    await wrapper.setProps({ blob: { ...blob, endEpoch: 590 } })
    expect(wrapper.get('output').text()).toBe('')
    expect(wrapper.findAll('button').some((b) => b.text() === 'Show cost')).toBe(true)
  })
})
