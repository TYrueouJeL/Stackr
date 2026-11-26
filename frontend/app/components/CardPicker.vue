<script setup lang="ts">
import type { Card, Paginated } from '~/utils/types'

const emit = defineEmits<{ pick: [card: Card] }>()
const q = ref('')
const results = ref<Card[]>([])
let timer: ReturnType<typeof setTimeout> | undefined

watch(q, (value) => {
  clearTimeout(timer)
  if (value.trim().length < 2) {
    results.value = []
    return
  }
  timer = setTimeout(async () => {
    const res = await api<Paginated<Card>>('/cards', { query: { q: value.trim(), perPage: 12 } })
    results.value = res.data
  }, 250)
})

function pick(card: Card) {
  emit('pick', card)
  q.value = ''
  results.value = []
}
</script>

<template>
  <div class="stack" style="position: relative">
    <SearchInput v-model="q" placeholder="Ajouter une carte au deck…" />
    <div v-if="results.length" class="dropdown">
      <button v-for="c in results" :key="c.id" type="button" @click="pick(c)">
        <img v-if="c.thumbnailUrl" :src="c.thumbnailUrl" class="thumb" alt="" />
        <span class="stack" style="gap: 0">
          <strong style="font-weight: 600">{{ c.name }}</strong>
          <span class="tiny muted">{{ c.setId }} #{{ c.collectorNumber }} · {{ c.type }} · {{ c.owned }} possédé(s)</span>
        </span>
      </button>
    </div>
  </div>
</template>
