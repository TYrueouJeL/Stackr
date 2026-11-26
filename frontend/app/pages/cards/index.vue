<script setup lang="ts">
import type { Card, Paginated, SetSummary } from '~/utils/types'

const route = useRoute()
const router = useRouter()
const filters = reactive({
  q: String(route.query.q ?? ''),
  set: String(route.query.set ?? ''),
  rarity: String(route.query.rarity ?? ''),
  type: String(route.query.type ?? ''),
  faction: String(route.query.faction ?? ''),
  owned: String(route.query.owned ?? ''),
  page: Number(route.query.page ?? 1),
})

const query = computed(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== 1)))
watch(query, (q) => router.replace({ query: q }))
watch(() => [filters.q, filters.set, filters.rarity, filters.type, filters.faction, filters.owned], () => (filters.page = 1))

const { data: sets } = await useFetch<SetSummary[]>('/api/v1/sets', { default: () => [] })
const { data: options } = await useFetch<{ rarities: string[]; types: string[]; factions: string[] }>('/api/v1/cards/filters')
const { data: result } = await useFetch<Paginated<Card>>('/api/v1/cards', { query: computed(() => ({ ...filters, perPage: 60 })) })
</script>

<template>
  <div>
    <h1>Cartes</h1>
    <div class="row" style="margin-bottom: 1rem">
      <input v-model.lazy="filters.q" placeholder="Nom de la carte" />
      <select v-model="filters.set"><option value="">Toutes extensions</option><option v-for="s in sets" :key="s.id" :value="s.id">{{ s.name }}</option></select>
      <select v-model="filters.rarity"><option value="">Raretés</option><option v-for="r in options?.rarities" :key="r">{{ r }}</option></select>
      <select v-model="filters.type"><option value="">Types</option><option v-for="t in options?.types" :key="t">{{ t }}</option></select>
      <select v-model="filters.faction"><option value="">Factions</option><option v-for="f in options?.factions" :key="f">{{ f }}</option></select>
      <select v-model="filters.owned"><option value="">Possédées ou non</option><option value="yes">Possédées</option><option value="no">Manquantes</option></select>
    </div>

    <p class="muted small">{{ result?.meta.total ?? 0 }} cartes</p>
    <div class="grid cards">
      <CardTile v-for="card in result?.data" :key="card.id" :card="card" />
    </div>
    <div v-if="result && result.meta.lastPage > 1" class="row" style="margin-top: 1rem; justify-content: center">
      <button :disabled="filters.page <= 1" @click="filters.page--">Précédent</button>
      <span>Page {{ result.meta.currentPage }} / {{ result.meta.lastPage }}</span>
      <button :disabled="filters.page >= result.meta.lastPage" @click="filters.page++">Suivant</button>
    </div>
  </div>
</template>
