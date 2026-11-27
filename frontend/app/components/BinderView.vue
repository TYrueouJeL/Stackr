<script setup lang="ts">
import type { Copy } from '~/utils/types'

const props = defineProps<{ binderId: number; pocketsPerPage: number; pageCount: number; copies: Copy[] }>()
const emit = defineEmits<{ changed: [] }>()
const { show } = useToast()

// Double page comme un vrai classeur ouvert : 1-2, 3-4…
const spread = ref(0)
const spreads = computed(() => Math.ceil(props.pageCount / 2))
const pages = computed(() => [spread.value * 2 + 1, spread.value * 2 + 2].filter((p) => p <= props.pageCount))
const cols = computed(() => {
  const n = props.pocketsPerPage
  if (n === 12 || n === 16) return 4
  if (n === 18) return 6
  return Math.ceil(Math.sqrt(n))
})

const bySlot = computed(() => {
  const map = new Map<string, Copy>()
  for (const c of props.copies) if (c.binderPage && c.binderSlot) map.set(`${c.binderPage}:${c.binderSlot}`, c)
  return map
})
const unplaced = computed(() => props.copies.filter((c) => !c.binderPage || !c.binderSlot))
const filled = computed(() => props.copies.length - unplaced.value.length)

const selected = ref<number | null>(null)
const dragOver = ref<string | null>(null)
const selectedCopy = computed(() => props.copies.find((c) => c.id === selected.value) ?? null)

async function place(copyId: number, page: number | null, slot: number | null) {
  try {
    await api(`/copies/${copyId}/slot`, { method: 'PUT', body: { page, slot } })
    selected.value = null
    emit('changed')
  } catch (e) {
    show(apiError(e), 'error')
  }
}

function clickPocket(page: number, slot: number) {
  const occupant = bySlot.value.get(`${page}:${slot}`)
  if (selected.value && selected.value !== occupant?.id) return place(selected.value, page, slot)
  selected.value = occupant && selected.value !== occupant.id ? occupant.id : null
}

function onDrop(event: DragEvent, page: number, slot: number) {
  dragOver.value = null
  const id = Number(event.dataTransfer?.getData('text/plain'))
  if (id) place(id, page, slot)
}
function onDragStart(event: DragEvent, copy: Copy) {
  event.dataTransfer?.setData('text/plain', String(copy.id))
  selected.value = copy.id
}

// Range les exemplaires non placés dans les premières pochettes libres
async function fillEmpty() {
  const free: [number, number][] = []
  for (let p = 1; p <= props.pageCount; p++)
    for (let s = 1; s <= props.pocketsPerPage; s++) if (!bySlot.value.has(`${p}:${s}`)) free.push([p, s])
  const todo = unplaced.value.slice(0, free.length)
  for (const [i, copy] of todo.entries()) await api(`/copies/${copy.id}/slot`, { method: 'PUT', body: { page: free[i]![0], slot: free[i]![1] } })
  show(`${todo.length} exemplaire(s) placé(s)${unplaced.value.length > todo.length ? ', classeur plein' : ''}`)
  emit('changed')
}

function goToCopy(copy: Copy) {
  if (copy.binderPage) spread.value = Math.floor((copy.binderPage - 1) / 2)
}
defineExpose({ goToCopy })
</script>

<template>
  <section class="binder">
    <div class="binder-bar">
      <button class="icon" :disabled="spread === 0" title="Pages précédentes" @click="spread--">‹</button>
      <strong class="binder-pages">Pages {{ pages.join(' – ') }} <span class="faint">/ {{ pageCount }}</span></strong>
      <button class="icon" :disabled="spread >= spreads - 1" title="Pages suivantes" @click="spread++">›</button>
      <select :value="spread" class="small" @change="spread = Number(($event.target as HTMLSelectElement).value)">
        <option v-for="i in spreads" :key="i" :value="i - 1">Pages {{ i * 2 - 1 }}{{ i * 2 <= pageCount ? `–${i * 2}` : '' }}</option>
      </select>
      <span class="spacer" />
      <span class="tiny muted">{{ filled }} / {{ pocketsPerPage * pageCount }} pochettes remplies</span>
    </div>

    <div class="binder-spread">
      <div v-for="page in pages" :key="page" class="binder-page" :style="{ gridTemplateColumns: `repeat(${cols}, 1fr)` }">
        <span class="page-number">p. {{ page }}</span>
        <button
          v-for="slot in pocketsPerPage"
          :key="slot"
          type="button"
          class="pocket"
          :class="{
            filled: bySlot.has(`${page}:${slot}`),
            selected: bySlot.get(`${page}:${slot}`)?.id === selected,
            target: selected && !bySlot.has(`${page}:${slot}`),
            over: dragOver === `${page}:${slot}`,
          }"
          :title="bySlot.get(`${page}:${slot}`)?.card?.name ?? `Page ${page}, pochette ${slot}/${pocketsPerPage}`"
          @click="clickPocket(page, slot)"
          @dragover.prevent="dragOver = `${page}:${slot}`"
          @dragleave="dragOver = null"
          @drop.prevent="onDrop($event, page, slot)"
        >
          <template v-if="bySlot.get(`${page}:${slot}`)">
            <img
              v-if="bySlot.get(`${page}:${slot}`)!.card?.thumbnailUrl"
              :src="bySlot.get(`${page}:${slot}`)!.card!.thumbnailUrl!"
              :alt="bySlot.get(`${page}:${slot}`)!.card?.name"
              draggable="true"
              loading="lazy"
              @dragstart="onDragStart($event, bySlot.get(`${page}:${slot}`)!)"
            />
            <span v-else class="pocket-name" draggable="true" @dragstart="onDragStart($event, bySlot.get(`${page}:${slot}`)!)">{{ bySlot.get(`${page}:${slot}`)!.card?.name }}</span>
            <span v-if="bySlot.get(`${page}:${slot}`)!.foil" class="pocket-foil">FOIL</span>
          </template>
          <span v-else class="pocket-empty">{{ slot }}/{{ pocketsPerPage }}</span>
        </button>
      </div>
    </div>

    <div v-if="selectedCopy" class="panel row binder-selection">
      <span><strong>{{ selectedCopy.card?.name }}</strong>
        <span class="muted small"> · #{{ selectedCopy.id }}{{ selectedCopy.binderPage ? ` · page ${selectedCopy.binderPage}, pochette ${selectedCopy.binderSlot}/${pocketsPerPage}` : ' · pas encore placé' }}</span></span>
      <span class="muted small">Clique sur une pochette pour l'y mettre (une pochette occupée échange les cartes).</span>
      <span class="spacer" />
      <button v-if="selectedCopy.binderPage" class="small ghost" @click="place(selectedCopy.id, null, null)">Sortir de la pochette</button>
      <button class="small ghost" @click="selected = null">Annuler</button>
    </div>

    <div class="unplaced">
      <div class="row between">
        <span class="eyebrow">À placer · {{ unplaced.length }}</span>
        <button v-if="unplaced.length" class="small" @click="fillEmpty">Remplir les pochettes libres</button>
      </div>
      <div v-if="!unplaced.length" class="tiny muted">Tous les exemplaires de ce classeur sont dans une pochette.</div>
      <div v-else class="unplaced-list">
        <button
          v-for="c in unplaced"
          :key="c.id"
          type="button"
          class="unplaced-card"
          :class="{ selected: selected === c.id }"
          draggable="true"
          :title="c.card?.name"
          @dragstart="onDragStart($event, c)"
          @click="selected = selected === c.id ? null : c.id"
        >
          <img v-if="c.card?.thumbnailUrl" :src="c.card.thumbnailUrl" :alt="c.card?.name" loading="lazy" />
          <span v-else class="pocket-name">{{ c.card?.name }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.binder { display: flex; flex-direction: column; gap: 1rem; margin-bottom: 1.6rem; }
.binder-bar { width: 100%; max-width: 940px; margin: 0 auto; display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; }
.binder-pages { font-family: var(--font-display); min-width: 9rem; text-align: center; }
.binder-spread {
  width: 100%;
  max-width: 940px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  padding: 1.1rem;
  border-radius: var(--radius-lg);
  background: linear-gradient(90deg, #191d33 0%, #11142a 49%, #07080f 50%, #11142a 51%, #191d33 100%);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg), inset 0 0 0 6px rgba(0, 0, 0, 0.25);
}
.binder-page { position: relative; display: grid; gap: 0.55rem; padding: 1.4rem 0.9rem 0.9rem; }
.binder-page + .binder-page { border-left: 2px dashed rgba(255, 255, 255, 0.07); }
.page-number { position: absolute; top: 0.2rem; left: 0.9rem; font-size: 0.7rem; color: var(--faint); letter-spacing: 0.08em; text-transform: uppercase; }
.pocket {
  position: relative;
  aspect-ratio: 744 / 1039;
  padding: 0;
  border-radius: 7px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.015));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
  overflow: hidden;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: transform 0.2s var(--ease), border-color 0.2s, box-shadow 0.2s;
}
.pocket::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(125deg, rgba(255, 255, 255, 0.12), transparent 35%);
  pointer-events: none;
}
.pocket img { width: 100%; height: 100%; object-fit: cover; display: block; }
.pocket.filled:hover { transform: translateY(-3px); box-shadow: 0 10px 18px -8px rgba(0, 0, 0, 0.8); }
.pocket.target { border-style: dashed; border-color: rgba(227, 180, 95, 0.45); }
.pocket.selected, .pocket.over { border-color: var(--gold); box-shadow: 0 0 0 2px var(--gold), 0 0 22px -4px var(--gold); }
.pocket-empty { font-size: 0.72rem; color: var(--faint); }
.pocket-name { font-size: 0.7rem; padding: 0.3rem; text-align: center; color: var(--text); }
.pocket-foil {
  position: absolute;
  bottom: 4px;
  right: 4px;
  font-size: 0.55rem;
  font-weight: 700;
  padding: 0.05rem 0.3rem;
  border-radius: 4px;
  background: linear-gradient(90deg, #f7dc9b, #8d6cf7, #3fd8c8);
  color: #0a0c18;
}
.binder-selection { position: sticky; bottom: 1rem; z-index: 4; background: rgba(18, 22, 40, 0.96); gap: 0.8rem; }
.unplaced { display: flex; flex-direction: column; gap: 0.6rem; }
.unplaced-list { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.unplaced-card {
  width: 64px;
  aspect-ratio: 744 / 1039;
  padding: 0;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-strong);
  background: var(--surface-2);
  cursor: grab;
  display: grid;
  place-items: center;
}
.unplaced-card img { width: 100%; height: 100%; object-fit: cover; }
.unplaced-card.selected { border-color: var(--gold); box-shadow: 0 0 0 2px var(--gold); }
@media (max-width: 760px) {
  .binder-spread { grid-template-columns: 1fr; padding: 0.6rem; background: #151930; }
  .binder-page + .binder-page { border-left: 0; border-top: 2px dashed rgba(255, 255, 255, 0.07); }
  .binder-page { gap: 0.35rem; padding: 1.3rem 0.4rem 0.5rem; }
}
</style>
