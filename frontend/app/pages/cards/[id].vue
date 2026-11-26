<script setup lang="ts">
import type { CardDetail } from '~/utils/types'

const route = useRoute()
const { data: card, refresh } = await useFetch<CardDetail>(() => `/api/v1/cards/${encodeURIComponent(String(route.params.id))}`)
const { refresh: refreshRefs } = useRefs()
onMounted(() => refreshRefs())

const stats = computed(() =>
  Object.entries(card.value?.stats ?? {}).filter(([, v]) => v !== null && v !== undefined)
)
const labels: Record<string, string> = { energy: 'Énergie', might: 'Puissance', cost: 'Coût', power: 'Power' }
</script>

<template>
  <div v-if="card">
    <NuxtLink :to="`/sets/${encodeURIComponent(card.set.id)}`" class="small">← {{ card.set.name }}</NuxtLink>
    <div class="row" style="align-items: flex-start; gap: 1.5rem; margin-top: .5rem">
      <div style="width: 260px; max-width: 100%">
        <img v-if="card.fullUrl || card.thumbnailUrl" :src="card.fullUrl ?? card.thumbnailUrl ?? ''" :alt="card.name" style="width: 100%; border-radius: var(--radius)" />
        <div v-else class="panel empty">Pas d'image</div>
      </div>
      <div class="stack" style="flex: 1; min-width: 260px">
        <h1 style="margin: 0">{{ card.name }}</h1>
        <div class="row small">
          <span class="tag">{{ card.set.id }} #{{ card.collectorNumber ?? '?' }}</span>
          <span v-if="card.type" class="tag">{{ card.type }}</span>
          <span v-if="card.rarity" class="tag">{{ card.rarity }}</span>
          <span v-if="card.faction" class="tag">{{ card.faction }}</span>
          <span v-for="k in card.keywords" :key="k" class="tag">{{ k }}</span>
        </div>
        <div v-if="stats.length" class="row small">
          <span v-for="[k, v] in stats" :key="k"><span class="muted">{{ labels[k] ?? k }}</span> <strong>{{ v }}</strong></span>
        </div>
        <p v-if="card.description" style="white-space: pre-line; margin: 0">{{ card.description }}</p>
        <p v-if="card.flavorText" class="muted" style="font-style: italic; margin: 0">{{ card.flavorText }}</p>
        <p v-if="card.artist" class="muted small" style="margin: 0">Illustration : {{ card.artist }}</p>

        <div class="panel">
          <div class="stat">{{ card.owned }} <span class="muted small">exemplaire(s)</span></div>
          <div v-if="card.decklists.length" class="small" style="margin-top: .4rem">
            Dans les decklists :
            <span v-for="d in card.decklists" :key="d.id" class="tag" :class="d.assigned >= d.quantity ? 'ok' : 'warn'" style="margin-right: .3rem">
              <NuxtLink :to="`/decklists/${d.id}`">{{ d.name }}</NuxtLink> {{ d.assigned }}/{{ d.quantity }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <h2>Ajouter des exemplaires</h2>
    <AddCopiesForm :card-id="card.id" @added="refresh()" />

    <h2>Mes exemplaires</h2>
    <div v-if="!card.copies.length" class="muted">Tu n'as aucun exemplaire de cette carte.</div>
    <div v-else class="table-wrap panel">
      <table>
        <thead><tr><th>N°</th><th>Rangement</th><th>Decklist</th><th>État</th><th>Foil</th><th>Langue</th><th /></tr></thead>
        <tbody><CopyRow v-for="c in card.copies" :key="c.id" :copy="c" @changed="refresh()" /></tbody>
      </table>
    </div>
  </div>
</template>
