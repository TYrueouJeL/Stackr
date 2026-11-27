<script setup lang="ts">
import type { HistoryPage, HistoryEvent } from '~/utils/types'

const route = useRoute()
const page = computed(() => Number(route.query.page ?? 1) || 1)
const action = computed(() => (route.query.action as string) || '')

const { data, pending } = await useApiFetch<HistoryPage>(
  () => `/history?page=${page.value}&perPage=50${action.value ? `&action=${action.value}` : ''}`,
  { watch: [page, action] }
)

const days = computed(() => {
  const groups: { day: string; events: HistoryEvent[] }[] = []
  for (const event of data.value?.data ?? []) {
    const day = new Date(event.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const last = groups.at(-1)
    if (last?.day === day) last.events.push(event)
    else groups.push({ day, events: [event] })
  }
  return groups
})

function setFilter(value: string) {
  navigateTo({ query: { ...route.query, action: value || undefined, page: undefined } })
}
function goTo(p: number) {
  navigateTo({ query: { ...route.query, page: p > 1 ? p : undefined } })
}
function describe(e: HistoryEvent) {
  const d = e.details ?? {}
  return [d.foil ? 'Foil' : null, d.condition, d.language, d.storage ? `📦 ${d.storage}` : null, d.decklist ? `🎴 ${d.decklist}` : null]
    .filter(Boolean)
    .join(' · ')
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="stack">
        <span class="eyebrow">Collection</span>
        <h1 style="margin: 0">Historique</h1>
        <p class="muted small" style="margin: 0">Chaque ajout et chaque retrait d'exemplaire, du plus récent au plus ancien.</p>
      </div>
      <div class="row">
        <button :class="action === '' ? 'primary' : 'ghost'" @click="setFilter('')">Tout</button>
        <button :class="action === 'added' ? 'primary' : 'ghost'" @click="setFilter('added')">Ajouts</button>
        <button :class="action === 'removed' ? 'primary' : 'ghost'" @click="setFilter('removed')">Retraits</button>
      </div>
    </div>

    <div v-if="data" class="row" style="margin-bottom: 1.2rem">
      <span class="tag ok">+{{ data.totals.added }} ajouté{{ data.totals.added > 1 ? 's' : '' }}</span>
      <span class="tag danger">−{{ data.totals.removed }} retiré{{ data.totals.removed > 1 ? 's' : '' }}</span>
    </div>

    <div v-if="!pending && !data?.data.length" class="empty">
      <div class="icon">🕰️</div>
      Rien pour l'instant. Les ajouts et retraits d'exemplaires apparaîtront ici.
    </div>

    <section v-for="g in days" :key="g.day" class="day fade-up">
      <h3 class="day-title">{{ g.day }}</h3>
      <div class="panel events">
        <div v-for="e in g.events" :key="e.id" class="event">
          <span class="badge" :class="e.action">{{ e.action === 'added' ? '+' : '−' }}{{ e.quantity }}</span>
          <img v-if="e.card?.thumbnailUrl" :src="e.card.thumbnailUrl" :alt="e.card.name" class="thumb" loading="lazy" />
          <div class="stack" style="gap: 0.15rem; min-width: 0; flex: 1">
            <NuxtLink v-if="e.card" :to="`/cards/${encodeURIComponent(e.card.id)}`" class="name">{{ e.card.name }}</NuxtLink>
            <span v-else class="name faint">Carte supprimée du catalogue</span>
            <span class="tiny faint">
              <template v-if="e.card">{{ e.card.setId }} #{{ e.card.collectorNumber ?? '?' }}</template>
              <template v-if="describe(e)"> · {{ describe(e) }}</template>
            </span>
          </div>
          <span class="tiny muted time">{{ new Date(e.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) }}</span>
        </div>
      </div>
    </section>

    <div v-if="data && data.meta.lastPage > 1" class="row" style="justify-content: center; margin-top: 1.5rem">
      <button class="ghost" :disabled="page <= 1" @click="goTo(page - 1)">← Plus récent</button>
      <span class="small muted">Page {{ page }} / {{ data.meta.lastPage }}</span>
      <button class="ghost" :disabled="page >= data.meta.lastPage" @click="goTo(page + 1)">Plus ancien →</button>
    </div>
  </div>
</template>

<style scoped>
.day { margin-bottom: 1.4rem; }
.day-title { text-transform: capitalize; font-size: 0.95rem; color: var(--muted); margin: 0 0 0.5rem; }
.events { padding: 0.3rem 0; }
.event { display: flex; align-items: center; gap: 0.8rem; padding: 0.55rem 1rem; }
.event + .event { border-top: 1px solid rgba(255, 255, 255, 0.06); }
.badge { min-width: 2.6rem; text-align: center; font-weight: 700; border-radius: 999px; padding: 0.15rem 0.5rem; font-variant-numeric: tabular-nums; }
.badge.added { color: var(--ok, #4fd18b); background: rgba(79, 209, 139, 0.12); }
.badge.removed { color: var(--danger, #f06a6a); background: rgba(240, 106, 106, 0.12); }
.thumb { width: 34px; height: 47px; object-fit: cover; border-radius: 4px; flex-shrink: 0; }
.name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.time { flex-shrink: 0; }
</style>
