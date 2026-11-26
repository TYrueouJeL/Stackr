<script setup lang="ts">
import type { SetDetail } from '~/utils/types'

const route = useRoute()
const { data: set, refresh } = await useApiFetch<SetDetail>(() => `/sets/${encodeURIComponent(String(route.params.id))}`)
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

async function quickAdd(cardId: string, name: string) {
  try {
    await api('/copies', { method: 'POST', body: { cardId } })
    show(`${name} ajoutée à ta collection`)
    await refresh()
  } catch (e) {
    show(apiError(e), 'error')
  }
}
</script>

<template>
  <div v-if="set">
    <NuxtLink to="/" class="back">← Toutes les extensions</NuxtLink>
    <section class="hero fade-up" style="padding: 1.6rem 1.8rem">
      <div class="hero-inner">
        <div class="stack" style="gap: 0.5rem">
          <span class="eyebrow">Extension · {{ set.id }}</span>
          <h1>{{ set.name }}</h1>
          <span class="muted">{{ set.ownedCards }} / {{ set.totalCards }} cartes · {{ set.totalCopies }} exemplaires</span>
          <div class="row" style="margin-top: 0.4rem">
            <span v-for="(r, name) in set.byRarity" :key="name" class="tag rarity" :class="rarityClass(String(name))">
              {{ name }} <strong>{{ r.owned }}/{{ r.total }}</strong>
            </span>
          </div>
        </div>
        <ProgressRing :value="set.completion" :size="130" :stroke="10" />
      </div>
    </section>

    <div class="toolbar">
      <SearchInput v-model="q" placeholder="Filtrer par nom" />
      <div class="segmented">
        <button :class="{ on: filter === 'all' }" @click="filter = 'all'">Toutes</button>
        <button :class="{ on: filter === 'owned' }" @click="filter = 'owned'">Possédées</button>
        <button :class="{ on: filter === 'missing' }" @click="filter = 'missing'">Manquantes</button>
      </div>
      <select v-model="rarity">
        <option value="">Toutes raretés</option>
        <option v-for="(_, name) in set.byRarity" :key="name" :value="name">{{ name }}</option>
      </select>
      <span class="tiny muted">{{ cards.length }} cartes</span>
    </div>

    <div v-if="!cards.length" class="empty"><div class="icon">🔍</div>Aucune carte ne correspond à ces filtres.</div>
    <div class="grid cards">
      <CardTile v-for="card in cards" :key="card.id" :card="card">
        <template #quick>
          <button class="primary small" :title="`Ajouter un exemplaire de ${card.name}`" @click="quickAdd(card.id, card.name)">+ 1</button>
        </template>
      </CardTile>
    </div>
  </div>
</template>
