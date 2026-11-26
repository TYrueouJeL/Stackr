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

const { data: sets } = await useApiFetch<SetSummary[]>('/sets', { default: () => [] })
const { data: options } = await useApiFetch<{ rarities: string[]; types: string[]; factions: string[] }>('/cards/filters')
const { data: result, status } = await useApiFetch<Paginated<Card>>('/cards', { query: computed(() => ({ ...filters, perPage: 60 })) })

function goTo(page: number) {
  filters.page = page
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="stack">
        <span class="eyebrow">Catalogue</span>
        <h1>Toutes les cartes</h1>
      </div>
      <span class="muted small">{{ result?.meta.total ?? 0 }} cartes</span>
    </div>

    <div class="toolbar">
      <SearchInput v-model="filters.q" lazy placeholder="Nom ou numéro, ex. Cull the Weak, OGN 209 (Entrée pour chercher)" />
      <select v-model="filters.set"><option value="">Toutes extensions</option><option v-for="s in sets" :key="s.id" :value="s.id">{{ s.name }}</option></select>
      <select v-model="filters.rarity"><option value="">Raretés</option><option v-for="r in options?.rarities" :key="r">{{ r }}</option></select>
      <select v-model="filters.type"><option value="">Types</option><option v-for="t in options?.types" :key="t">{{ t }}</option></select>
      <select v-model="filters.faction"><option value="">Domaines</option><option v-for="f in options?.factions" :key="f">{{ f }}</option></select>
      <div class="segmented">
        <button :class="{ on: filters.owned === '' }" @click="filters.owned = ''">Toutes</button>
        <button :class="{ on: filters.owned === 'yes' }" @click="filters.owned = 'yes'">Possédées</button>
        <button :class="{ on: filters.owned === 'no' }" @click="filters.owned = 'no'">Manquantes</button>
      </div>
    </div>

    <div v-if="result && !result.data.length" class="empty"><div class="icon">🔍</div>Aucune carte ne correspond à ta recherche.</div>
    <div class="grid cards" :style="{ opacity: status === 'pending' ? 0.55 : 1, transition: 'opacity .2s' }">
      <CardTile v-for="card in result?.data" :key="card.id" :card="card" />
    </div>
    <div v-if="result && result.meta.lastPage > 1" class="row" style="margin-top: 2rem; justify-content: center">
      <button :disabled="filters.page <= 1" @click="goTo(filters.page - 1)">← Précédent</button>
      <span class="small muted">Page {{ result.meta.currentPage }} / {{ result.meta.lastPage }}</span>
      <button :disabled="filters.page >= result.meta.lastPage" @click="goTo(filters.page + 1)">Suivant →</button>
    </div>
  </div>
</template>
