<script setup lang="ts">
// Extend one blob's storage: choose how many epochs to add (clamped to what the chain still allows), see what that costs in WAL, then
// extend. The wallet opens only for an amount whose cost has been shown (audit F12): the first press prices the amount, the second
// confirms. The quote is an estimate (≈); the wallet and the chain decide what is actually paid.
import { computed, ref, watch } from 'vue'
import { UiButton, UiInput, UiLiveStatus } from '@meddleware/ui'
import { truncateMiddle } from '@meddleware/web-utils'
import { formatCoinAmount } from '@meddleware/walrus-storage-kit'
import type { OwnedBlob } from '@meddleware/walrus-storage-client'
import { useExtendQuotes, type EstimateExtendCost } from '../composables/useExtendQuotes.js'

const props = defineProps<{
  /** The blob (the group's furthest-expiry copy) to extend. */
  blob: OwnedBlob
  /** Epochs that can still be added; the control is not shown at 0. */
  max: number
  /** Another action is running. */
  disabled: boolean
  /** This blob's extension is running. */
  busy: boolean
  /** Prices storing `size` bytes for `epochs` (WAL, FROST). */
  estimate: EstimateExtendCost
}>()
const emit = defineEmits<{ extend: [epochs: number] }>()

const quotes = useExtendQuotes(props.estimate)
// Seeded with a sensible default (+10, clamped) without pricing it: the estimate is fetched on the first interaction, not for every row.
const amount = ref(Math.min(10, props.max))

function clamp(value: number | string): number {
  return Math.min(props.max, Math.max(1, Math.floor(Number(value) || 1)))
}

/** The person picked an amount: clamp it and (re)price it. */
function pick(value: number | string): void {
  amount.value = clamp(value)
  void quotes.price(props.blob.objectId, props.blob.size, amount.value)
}

const quote = computed(() => quotes.quoteFor(props.blob.objectId, amount.value))
const quoteText = computed(() => {
  const q = quote.value
  if (q?.state === 'ready') return `≈${formatCoinAmount(q.costFrost, 'WAL')} for +${q.epochs} epochs`
  if (q?.state === 'unavailable') return 'price unavailable'
  return quotes.pricing.value[props.blob.objectId] === amount.value ? 'pricing…' : ''
})

async function extend(): Promise<void> {
  if (props.disabled || props.busy) return
  if (await quotes.shownBeforeSigning(props.blob.objectId, props.blob.size, amount.value)) emit('extend', amount.value)
}

// An extension changes the blob's end epoch (and what it may still add): the old quote no longer applies.
watch(
  () => props.blob.endEpoch,
  () => {
    quotes.clear(props.blob.objectId)
    amount.value = clamp(amount.value)
  },
)
watch(
  () => props.max,
  (max) => {
    if (amount.value > max) amount.value = Math.max(1, max)
  },
)
</script>

<template>
  <fieldset class="extend">
    <legend class="mw-visually-hidden">Extend {{ truncateMiddle(blob.blobId, [8, 6]) }}</legend>
    <UiInput
      type="number"
      min="1"
      :max="max"
      :model-value="amount"
      :aria-label="`Epochs to add to ${truncateMiddle(blob.blobId, [8, 6])}`"
      @update:model-value="pick($event ?? 1)"
    />
    <UiButton variant="ghost" size="sm" @click="pick(10)">+10</UiButton>
    <UiButton variant="ghost" size="sm" @click="pick(25)">+25</UiButton>
    <UiButton variant="ghost" size="sm" @click="pick(max)">Max</UiButton>
    <UiButton size="sm" :disabled="disabled" :busy="busy" @click="extend">{{ quote ? 'Extend' : 'Show cost' }}</UiButton>
    <UiLiveStatus label="Extension cost" :message="quoteText" />
  </fieldset>
</template>

<style scoped>
.extend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-3xs);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}
.extend :deep(.mw-input) {
  width: 5em;
}
</style>
