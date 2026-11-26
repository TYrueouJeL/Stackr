<script setup lang="ts">
import type { DecklistSummary } from '~/utils/types'

const { data: decklists, refresh } = await useApiFetch<DecklistSummary[]>('/decklists', { default: () => [] })
const name = ref('')
const { show } = useToast()

async function create() {
  if (!name.value.trim()) return
  try {
    const deck = await api<{ id: number }>('/decklists', { method: 'POST', body: { name: name.value } })
    name.value = ''
    await navigateTo(`/decklists/${deck.id}`)
  } catch (e) {
    show(apiError(e), 'error')
  }
  await refresh()
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="stack">
        <span class="eyebrow">Construction</span>
        <h1>Mes decklists</h1>
      </div>
      <form class="row" @submit.prevent="create">
        <input v-model="name" placeholder="Nom de la nouvelle decklist" style="min-width: 240px" />
        <button class="primary">+ Créer</button>
      </form>
    </div>

    <div v-if="!decklists?.length" class="empty"><div class="icon">🗂️</div>Aucune decklist pour l'instant. Donne un nom à ton premier deck pour commencer.</div>

    <div class="grid sets">
      <NuxtLink
        v-for="(d, i) in decklists"
        :key="d.id"
        :to="`/decklists/${d.id}`"
        class="panel deck-tile fade-up"
        :class="{ glow: d.complete }"
        :style="{ animationDelay: `${i * 60}ms` }"
      >
        <div class="fan">
          <img v-for="(src, j) in d.previews" :key="j" :src="src" alt="" loading="lazy" :style="{ '--i': j, '--n': d.previews.length }" />
          <div v-if="!d.previews.length" class="fan-empty"><Logo /></div>
        </div>
        <div class="stack" style="gap: 0.55rem">
          <div class="row between">
            <span class="name">{{ d.name }}</span>
            <span class="tag" :class="d.complete ? 'ok' : d.totalCards ? 'warn' : ''">
              {{ d.complete ? '✓ Complet' : d.totalCards ? 'Incomplet' : 'Vide' }}
            </span>
          </div>
          <ProgressBar :value="d.totalCards ? (d.assignedCopies / d.totalCards) * 100 : 0" />
          <span class="tiny muted">{{ d.assignedCopies }} / {{ d.totalCards }} exemplaires en place</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.deck-tile { display: flex !important; flex-direction: column; gap: 1rem; overflow: hidden; }
.deck-tile .name { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; }
.fan {
  position: relative;
  height: 150px;
  margin: -1.1rem -1.2rem 0;
  background: radial-gradient(circle at 50% 120%, rgba(227, 180, 95, 0.2), transparent 70%), rgba(0, 0, 0, 0.25);
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}
.fan img {
  position: absolute;
  left: 50%;
  top: 22px;
  width: 92px;
  aspect-ratio: 744 / 1039;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.7);
  transform-origin: 50% 120%;
  transform: translateX(-50%) rotate(calc((var(--i) - (var(--n) - 1) / 2) * 14deg));
  transition: transform 0.4s var(--ease);
}
.deck-tile:hover .fan img { transform: translateX(-50%) rotate(calc((var(--i) - (var(--n) - 1) / 2) * 20deg)) translateY(-6px); }
.fan-empty { height: 100%; display: grid; place-items: center; opacity: 0.35; }
.fan-empty svg { width: 56px; height: 56px; }
</style>
