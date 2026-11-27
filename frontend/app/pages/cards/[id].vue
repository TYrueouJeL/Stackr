<script setup lang="ts">
import { formatEuro, type CardDetail } from '~/utils/types'

const route = useRoute()
const { data: card, refresh } = await useApiFetch<CardDetail>(() => `/cards/${encodeURIComponent(String(route.params.id))}`)
const { refresh: refreshRefs } = useRefs()
onMounted(() => refreshRefs())

const labels: Record<string, string> = { energy: 'Énergie', might: 'Puissance', cost: 'Coût', power: 'Power' }
const stats = computed(() =>
  Object.entries(card.value?.stats ?? {}).filter(([, v]) => v !== null && v !== undefined)
)
const glow = computed(() => domainColor(card.value?.faction))
const image = computed(() => card.value?.fullUrl ?? card.value?.thumbnailUrl ?? null)
const tile = computed(() => (card.value ? { ...card.value, thumbnailUrl: image.value } : null))

useHead(() => ({ title: card.value ? `${card.value.name} · Stackr` : 'Stackr' }))
</script>

<template>
  <div v-if="card && tile">
    <NuxtLink :to="`/sets/${encodeURIComponent(card.set.id)}`" class="back">← {{ card.set.name }}</NuxtLink>

    <div class="card-hero fade-up" :style="{ '--glow': glow }">
      <div class="art">
        <CardTile :card="tile" :count="card.owned" hide-meta />
      </div>

      <div class="stack" style="gap: 1.1rem">
        <div class="stack" style="gap: 0.45rem">
          <span class="eyebrow">{{ card.set.name }} · #{{ card.collectorNumber ?? '?' }}</span>
          <h1>{{ card.name }}</h1>
          <div class="row">
            <span v-if="card.rarity" class="tag rarity" :class="rarityClass(card.rarity)">{{ card.rarity }}</span>
            <span v-if="card.type" class="tag">{{ card.type }}</span>
            <span v-for="d in domainList(card.faction)" :key="d.name" class="tag" :style="{ color: d.color, borderColor: `${d.color}66` }">
              <span class="dot" :style="{ background: d.color, color: d.color }" /> {{ d.name }}
            </span>
            <span v-for="k in card.keywords" :key="k" class="tag">{{ k }}</span>
            <span v-for="t in card.tags" :key="t" class="tag faint">{{ t }}</span>
          </div>
        </div>

        <div v-if="stats.length" class="stat-chips">
          <div v-for="[k, v] in stats" :key="k" class="stat-chip"><strong>{{ v }}</strong><span>{{ labels[k] ?? k }}</span></div>
        </div>

        <div v-if="card.description" class="rules"><RulesText :text="card.description" /></div>
        <p v-if="card.flavorText" class="flavor" style="margin: 0">« {{ card.flavorText }} »</p>
        <p v-if="card.artist" class="tiny faint" style="margin: 0">Illustration : {{ card.artist }}</p>

        <div class="grid stats">
          <div class="panel stat-card">
            <div class="value" :class="{ 'gold-text': card.owned > 0 }">{{ card.owned }}</div>
            <div class="label">Exemplaire{{ card.owned > 1 ? 's' : '' }} possédé{{ card.owned > 1 ? 's' : '' }}</div>
          </div>
          <div class="panel stat-card">
            <div class="value">{{ card.copies.filter((c) => !c.decklistId).length }}</div>
            <div class="label">Libres (hors deck)</div>
          </div>
        </div>

        <div v-if="card.price" class="panel price-panel">
          <div class="stack" style="gap: 0.2rem">
            <span class="eyebrow">Prix Cardmarket</span>
            <strong class="gold-text price-main">{{ formatEuro(card.price.trend ?? card.price.trendFoil) }}</strong>
            <span class="tiny faint">Tendance{{ card.price.trend === null ? ' (foil)' : '' }}</span>
          </div>
          <div class="price-grid small">
            <span class="muted">Plus bas</span><span>{{ formatEuro(card.price.low) }}</span>
            <span class="muted">Moyenne 30 j</span><span>{{ formatEuro(card.price.avg30) }}</span>
            <span class="muted">Foil tendance</span><span>{{ formatEuro(card.price.trendFoil) }}</span>
            <span class="muted">Foil plus bas</span><span>{{ formatEuro(card.price.lowFoil) }}</span>
          </div>
          <a :href="card.price.url" target="_blank" rel="noopener" class="tag">Voir sur Cardmarket ↗</a>
        </div>

        <div v-if="card.decklists.length" class="stack" style="gap: 0.4rem">
          <span class="eyebrow">Utilisée dans</span>
          <div class="row">
            <NuxtLink v-for="d in card.decklists" :key="d.id" :to="`/decklists/${d.id}`" class="tag" :class="d.assigned >= d.quantity ? 'ok' : 'warn'">
              {{ d.name }} · {{ d.assigned }}/{{ d.quantity }}
            </NuxtLink>
          </div>
        </div>

        <div class="panel">
          <h3 style="margin-bottom: 0.8rem">Ajouter des exemplaires</h3>
          <AddCopiesForm :card-id="card.id" @added="refresh()" />
        </div>
      </div>
    </div>

    <h2>Mes exemplaires</h2>
    <div v-if="!card.copies.length" class="empty"><div class="icon">📦</div>Tu n'as encore aucun exemplaire de cette carte.</div>
    <div v-else class="panel table-wrap">
      <table>
        <thead><tr><th>N°</th><th>Rangement</th><th>Decklist</th><th>État</th><th>Foil</th><th>Langue</th><th /></tr></thead>
        <tbody><CopyRow v-for="c in card.copies" :key="c.id" :copy="c" @changed="refresh()" /></tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.price-panel { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem 2rem; }
.price-main { font-family: var(--font-display); font-size: 1.8rem; }
.price-grid { display: grid; grid-template-columns: auto auto; gap: 0.2rem 1rem; font-variant-numeric: tabular-nums; }
</style>
