<script setup lang="ts">
import type { DecklistSummary } from '~/utils/types'

const { data: decklists, refresh } = await useApiFetch<DecklistSummary[]>('/decklists', { default: () => [] })
const name = ref('')
const { show } = useToast()

function deckStyle(d: DecklistSummary) {
  const colors = d.domains.map((name) => domainColor(name, '#d9ab52'))
  const a = colors[0] ?? '#d9ab52'
  const b = colors[1] ?? a
  return { '--c1': a, '--c2': b }
}

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
        :style="{ animationDelay: `${i * 60}ms`, ...deckStyle(d) }"
      >
        <div class="banner">
          <img v-for="(src, j) in d.images" :key="src" :src="src" alt="" loading="lazy" class="side" :class="j === 0 ? 'left' : 'right'" />
          <div v-if="d.legend" class="legend">
            <img v-if="d.legend.thumbnailUrl" :src="d.legend.thumbnailUrl" :alt="d.legend.name" loading="lazy" />
            <div v-else class="legend-ph">{{ d.legend.name }}</div>
          </div>
          <div v-else class="legend legend-empty"><span>Aucune<br />légende</span></div>
        </div>
        <div class="stack" style="gap: 0.55rem">
          <div class="row between" style="flex-wrap: nowrap">
            <span class="name">{{ d.name }}</span>
            <span class="tag" :class="d.complete ? 'ok' : d.totalCards ? 'warn' : ''">
              {{ d.complete ? '✓ Complet' : d.totalCards ? 'Incomplet' : 'Vide' }}
            </span>
          </div>
          <span class="small" :class="d.legend ? '' : 'faint'">
            <span class="faint">Légende :</span> {{ d.legend?.name ?? 'à choisir' }}
          </span>
          <div class="row" style="gap: 0.4rem">
            <span v-for="dom in domainList(d.domains.join(' / '))" :key="dom.name" class="tag" :style="{ color: dom.color, borderColor: `${dom.color}66`, background: `${dom.color}14` }">
              <span class="dot" :style="{ background: dom.color, color: dom.color }" /> {{ dom.name }}
            </span>
            <span v-if="!d.domains.length" class="tag faint">Couleurs inconnues</span>
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
.deck-tile::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--c1), var(--c2));
  z-index: 2;
}
.deck-tile .name { font-family: var(--font-display); font-weight: 700; font-size: 1.1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.banner {
  position: relative;
  height: 190px;
  margin: -1.1rem -1.2rem 0;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
  background:
    radial-gradient(circle at 30% 110%, color-mix(in srgb, var(--c1) 45%, transparent), transparent 60%),
    radial-gradient(circle at 70% 110%, color-mix(in srgb, var(--c2) 45%, transparent), transparent 60%),
    rgba(0, 0, 0, 0.3);
}
.banner .side {
  position: absolute;
  top: 34px;
  width: 84px;
  aspect-ratio: 744 / 1039;
  object-fit: cover;
  border-radius: 6px;
  opacity: 0.55;
  filter: saturate(0.8);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.7);
  transition: transform 0.4s var(--ease), opacity 0.3s;
}
.banner .side.left { left: calc(50% - 128px); transform: rotate(-12deg); }
.banner .side.right { left: calc(50% + 44px); transform: rotate(12deg); }
.deck-tile:hover .banner .side { opacity: 0.8; }
.deck-tile:hover .banner .side.left { transform: rotate(-16deg) translateX(-8px); }
.deck-tile:hover .banner .side.right { transform: rotate(16deg) translateX(8px); }
.legend {
  position: absolute;
  left: 50%;
  top: 16px;
  z-index: 1;
  width: 112px;
  aspect-ratio: 744 / 1039;
  transform: translateX(-50%);
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 16px 30px -6px rgba(0, 0, 0, 0.85), 0 0 0 2px rgba(247, 220, 155, 0.75),
    0 0 30px -4px color-mix(in srgb, var(--c1) 70%, transparent);
  transition: transform 0.4s var(--ease);
}
.deck-tile:hover .legend { transform: translateX(-50%) translateY(-4px) scale(1.03); }
.legend img { width: 100%; height: 100%; object-fit: cover; display: block; }
.legend-ph, .legend-empty span {
  height: 100%;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 0.5rem;
  font-family: var(--font-display);
  font-size: 0.8rem;
  background: linear-gradient(160deg, #1a1f38, #0c0f1d);
}
.legend-empty { box-shadow: 0 0 0 1px var(--border-strong); border: 1px dashed var(--border-strong); }
.legend-empty span { color: var(--faint); background: rgba(0, 0, 0, 0.35); }
</style>
