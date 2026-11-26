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
    <input v-model="q" placeholder="Rechercher une carte à ajouter…" />
    <div v-if="results.length" class="panel stack" style="position: absolute; top: 100%; left: 0; right: 0; z-index: 5; padding: .4rem; gap: 0">
      <button v-for="c in results" :key="c.id" type="button" style="text-align: left; border: none" @click="pick(c)">
        <strong>{{ c.name }}</strong>
        <span class="muted small"> · {{ c.setId }} #{{ c.collectorNumber }} · {{ c.type }} · {{ c.owned }} possédé(s)</span>
      </button>
    </div>
  </div>
</template>
