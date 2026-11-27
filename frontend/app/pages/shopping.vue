<script setup lang="ts">
import { formatEuro, type ShoppingList } from '~/utils/types'

const route = useRoute()
const { show } = useToast()
const selection = computed(() => (route.query.decklists as string) || '')

const { data, pending } = await useApiFetch<ShoppingList>(
  () => `/shopping-list${selection.value ? `?decklists=${selection.value}` : ''}`,
  { watch: [selection] }
)

function toggle(id: number) {
  const current = new Set((data.value?.decklists ?? []).filter((d) => d.selected).map((d) => d.id))
  if (current.has(id)) current.delete(id)
  else current.add(id)
  const all = data.value?.decklists.length ?? 0
  const value = current.size === 0 || current.size === all ? undefined : [...current].join(',')
  navigateTo({ query: { decklists: value } })
}
function selectAll() {
  navigateTo({ query: {} })
}

async function copyList() {
  if (!data.value?.text) return
  try {
    await navigator.clipboard.writeText(data.value.text)
    show('Liste copiée dans le presse-papiers')
  } catch {
    show('Impossible de copier la liste', 'error')
  }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="stack">
        <span class="eyebrow">Collection</span>
        <h1 style="margin: 0">Liste d'achat</h1>
        <p class="muted small" style="margin: 0">
          Les cartes qui te manquent pour monter les decks choisis, en comptant les exemplaires libres et ceux déjà dans ces decks.
        </p>
      </div>
      <button class="primary" :disabled="!data?.text" @click="copyList">📋 Copier la liste</button>
    </div>

    <div v-if="data?.decklists.length" class="panel decks">
      <span class="small muted">Decks pris en compte :</span>
      <button class="ghost small" @click="selectAll">Tous</button>
      <label v-for="d in data.decklists" :key="d.id" class="inline small deck">
        <input type="checkbox" :checked="d.selected" @change="toggle(d.id)" />
        {{ d.name }}
      </label>
    </div>

    <div v-if="data && !data.decklists.length" class="empty">
      <div class="icon">🎴</div>
      Crée d'abord une decklist pour savoir quelles cartes acheter.
    </div>

    <template v-else-if="data">
      <div class="grid stats summary">
        <div class="panel stat-card">
          <div class="value" :class="{ 'gold-text': data.totalMissing === 0 }">{{ data.totalMissing }}</div>
          <div class="label">Carte{{ data.totalMissing > 1 ? 's' : '' }} à acheter</div>
        </div>
        <div class="panel stat-card">
          <div class="value">{{ formatEuro(data.totalCost) }}</div>
          <div class="label">Coût estimé (tendance Cardmarket)</div>
        </div>
        <div class="panel stat-card">
          <div class="value">{{ data.totalNeeded - data.totalMissing }}<span class="faint" style="font-size: 0.6em"> / {{ data.totalNeeded }}</span></div>
          <div class="label">Déjà possédées</div>
        </div>
      </div>
      <p v-if="data.unpriced" class="tiny faint">{{ data.unpriced }} carte{{ data.unpriced > 1 ? 's' : '' }} sans prix connu, non comptée{{ data.unpriced > 1 ? 's' : '' }} dans le total.</p>

      <div v-if="!data.lines.length && !pending" class="empty">
        <div class="icon">✨</div>
        Tu as déjà tout ce qu'il faut pour ces decks.
      </div>

      <div v-else class="panel" style="padding: 0; overflow-x: auto">
        <table>
          <thead>
            <tr><th>Carte</th><th>Decks</th><th class="num">Besoin</th><th class="num">Dispo</th><th class="num">À acheter</th><th class="num">Prix</th><th class="num">Total</th></tr>
          </thead>
          <tbody>
            <tr v-for="l in data.lines" :key="l.key">
              <td>
                <NuxtLink :to="`/cards/${encodeURIComponent(l.card.id)}`" class="card-cell">
                  <img v-if="l.card.thumbnailUrl" :src="l.card.thumbnailUrl" :alt="l.name" class="thumb" loading="lazy" />
                  <span class="stack" style="gap: 0.1rem">
                    <strong>{{ l.name }}</strong>
                    <span class="tiny faint">{{ l.card.setId }} #{{ l.card.collectorNumber ?? '?' }} · {{ l.card.rarity ?? '—' }}</span>
                  </span>
                </NuxtLink>
              </td>
              <td class="small">
                <NuxtLink v-for="d in l.decklists" :key="d.id" :to="`/decklists/${d.id}`" class="tag" style="margin: 0.1rem">{{ d.name }} ×{{ d.quantity }}</NuxtLink>
              </td>
              <td class="num">{{ l.needed }}</td>
              <td class="num">{{ l.available }}</td>
              <td class="num"><span class="tag warn">{{ l.missing }}</span></td>
              <td class="num">
                <a v-if="l.price" :href="l.price.url" target="_blank" rel="noopener" title="Voir sur Cardmarket">{{ formatEuro(l.price.value) }}</a>
                <span v-else class="faint">—</span>
              </td>
              <td class="num"><strong>{{ formatEuro(l.total) }}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<style scoped>
.decks { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem 1rem; margin-bottom: 1.2rem; }
.deck { gap: 0.35rem; }
.summary { margin-bottom: 0.6rem; }
.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.card-cell { display: flex; align-items: center; gap: 0.7rem; color: inherit; }
.thumb { width: 34px; height: 47px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
</style>
