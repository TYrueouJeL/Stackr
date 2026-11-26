<script setup lang="ts">
import type { SetDetail } from '~/utils/types'

const route = useRoute()
const { data: set, refresh } = await useFetch<SetDetail>(() => `/api/v1/sets/${encodeURIComponent(String(route.params.id))}`)
const { show } = useToast()

const filter = ref<'all' | 'owned' | 'missing'>('all')
const rarity = ref('')
const q = ref('')

const cards = computed(() =>
  (set.value?.cards ?? []).filter((c) => {
    if (filter.value === 'owned' && c.owned === 0) return false
    if (filter.value === 'missing' && c.owned > 0) return false
    if (rarity.value && c.rarity !== rarity.value) return false
    if (q.value && !c.name.toLowerCase().includes(q.value.toLowerCase())) return false
    return true
  })
)

async function quickAdd(cardId: string) {
  await api('/copies', { method: 'POST', body: { cardId } })
  show('1 exemplaire ajouté')
  await refresh()
}
</script>

<template>
  <div v-if="set">
    <NuxtLink to="/" class="small">← Toutes les extensions</NuxtLink>
    <h1>{{ set.name }} <span class="tag">{{ set.id }}</span></h1>

    <div class="panel stack" style="margin-bottom: 1rem">
      <div class="row between">
        <strong>{{ set.completion }} % du masterset</strong>
        <span class="muted">{{ set.ownedCards }} / {{ set.totalCards }} cartes · {{ set.totalCopies }} exemplaires</span>
      </div>
      <ProgressBar :value="set.completion" />
      <div class="row small">
        <span v-for="(r, name) in set.byRarity" :key="name" class="tag" :class="{ ok: r.owned === r.total }">
          {{ name }} : {{ r.owned }}/{{ r.total }}
        </span>
      </div>
    </div>

    <div class="row" style="margin-bottom: 1rem">
      <input v-model="q" placeholder="Filtrer par nom" />
      <select v-model="filter">
        <option value="all">Toutes</option>
        <option value="owned">Possédées</option>
        <option value="missing">Manquantes</option>
      </select>
      <select v-model="rarity">
        <option value="">Toutes raretés</option>
        <option v-for="(_, name) in set.byRarity" :key="name" :value="name">{{ name }}</option>
      </select>
      <span class="muted small">{{ cards.length }} cartes</span>
    </div>

    <div class="grid cards">
      <div v-for="card in cards" :key="card.id" class="stack" style="gap: .3rem">
        <CardTile :card="card" />
        <button class="small" @click="quickAdd(card.id)">+1</button>
      </div>
    </div>
  </div>
</template>
