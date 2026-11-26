<script setup lang="ts">
import type { Card } from '~/utils/types'

const props = defineProps<{ card: Card; count?: number; label?: string; hideMeta?: boolean }>()
const owned = computed(() => props.count ?? props.card.owned ?? 0)
const glow = computed(() => domainColor(props.card.faction))
const landscape = computed(() => props.card.type === 'Battlefield')
const loaded = ref(false)
const failed = ref(false)
const frame = ref<HTMLElement | null>(null)
const img = ref<HTMLImageElement | null>(null)

// L'image peut finir de charger avant l'hydratation : on vérifie son état au montage
onMounted(() => {
  if (img.value?.complete) {
    if (img.value.naturalWidth > 0) loaded.value = true
    else failed.value = true
  }
})
watch(
  () => props.card.thumbnailUrl,
  () => {
    loaded.value = false
    failed.value = false
  }
)

function onMove(event: PointerEvent) {
  if (event.pointerType !== 'mouse' || !frame.value) return
  const rect = frame.value.getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  frame.value.style.setProperty('--ry', `${(x - 0.5) * 14}deg`)
  frame.value.style.setProperty('--rx', `${(0.5 - y) * 14}deg`)
  frame.value.style.setProperty('--mx', `${x * 100}%`)
  frame.value.style.setProperty('--my', `${y * 100}%`)
}
function onLeave() {
  frame.value?.style.setProperty('--rx', '0deg')
  frame.value?.style.setProperty('--ry', '0deg')
}
</script>

<template>
  <div class="card-tile" :class="{ missing: owned === 0, landscape }" :style="{ '--glow': glow }">
    <div style="position: relative">
    <NuxtLink
      :to="`/cards/${encodeURIComponent(card.id)}`"
      :aria-label="card.name"
      style="display: block; position: relative"
      @pointermove="onMove"
      @pointerleave="onLeave"
    >
      <div ref="frame" class="frame">
        <img
          v-if="card.thumbnailUrl && !failed"
          ref="img"
          :src="card.thumbnailUrl"
          :alt="card.name"
          loading="lazy"
          decoding="async"
          :class="{ loaded }"
          @load="loaded = true"
          @error="failed = true"
        />
        <div v-if="!loaded || failed || !card.thumbnailUrl" class="placeholder">
          <span>{{ card.name }}</span>
          <span class="tiny faint">{{ card.type }}</span>
        </div>
        <div class="sheen" />
      </div>
      <span class="count">{{ label ?? owned }}</span>
    </NuxtLink>
    <div v-if="$slots.quick" class="quick"><slot name="quick" /></div>
    </div>
    <div v-if="!hideMeta" class="meta">
      <span class="title" :title="card.name">{{ card.name }}</span>
      <span class="sub">
        <span class="dot" :class="rarityClass(card.rarity)" :style="{ color: 'var(--r)', background: 'var(--r)' }" />
        {{ card.rarity ?? '—' }} · #{{ card.collectorNumber ?? '?' }}
      </span>
    </div>
  </div>
</template>
