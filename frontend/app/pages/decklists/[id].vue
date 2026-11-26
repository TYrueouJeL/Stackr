<script setup lang="ts">
import { SECTION_LABELS, type Card, type Copy, type DeckSection, type DecklistDetail } from '~/utils/types'

const route = useRoute()
const id = computed(() => Number(route.params.id))
const { data: deck, refresh } = await useApiFetch<DecklistDetail>(() => `/decklists/${id.value}`)
const { show } = useToast()
const { refresh: refreshRefs, locations } = useRefs()
onMounted(() => refreshRefs())

const importText = ref('')
const replace = ref(false)
const showImport = ref(false)
const editing = ref(false)
const form = reactive({ name: '', description: '' })
const openRow = ref<string | null>(null)
const freeCopies = ref<Copy[]>([])
const pickSection = ref<DeckSection | ''>('')

type Entry = DecklistDetail['entries'][number]
const rowKey = (e: Entry) => `${e.section}:${e.card.id}`
const groups = computed(() =>
  (deck.value?.sections ?? []).filter((s) => s.count > 0).map((s) => ({
    ...s,
    label: SECTION_LABELS[s.section] ?? s.section,
    entries: deck.value!.entries.filter((e) => e.section === s.section),
  }))
)

function defaultSection(card: Card): DeckSection {
  if (card.type === 'Legend') return 'legend'
  if (card.type === 'Rune') return 'rune'
  if (card.type === 'Battlefield') return 'battlefield'
  return 'main'
}

watch(deck, (d) => { if (d) { form.name = d.name; form.description = d.description ?? '' } }, { immediate: true })

async function call<T>(path: string, options: any, message?: (r: T) => string) {
  try {
    const r = await api<T>(path, options)
    if (message) show(message(r))
    await refresh()
    return r
  } catch (e) {
    show(apiError(e), 'error')
  }
}

const setQuantity = (cardId: string, quantity: number, section: DeckSection) =>
  call(`/decklists/${id.value}/entries`, { method: 'PUT', body: { cardId, section, quantity: Math.max(0, quantity) } })

const addCard = (card: Card) => {
  const section = pickSection.value || defaultSection(card)
  const current = deck.value?.entries.find((e) => e.card.id === card.id && e.section === section)?.quantity ?? 0
  setQuantity(card.id, current + 1, section)
}

const autoAssign = () =>
  call<{ assigned: number }>(`/decklists/${id.value}/auto-assign`, { method: 'POST' }, (r) => `${r.assigned} exemplaire(s) affecté(s)`)

async function release() {
  if (!confirm('Libérer tous les exemplaires de cette decklist ?')) return
  await call<{ released: number }>(`/decklists/${id.value}/release`, { method: 'POST' }, () => 'Exemplaires libérés')
}

async function runImport() {
  const r = await call<{ imported: number; sections: Partial<Record<DeckSection, number>>; notFound: string[] }>(
    `/decklists/${id.value}/import`,
    { method: 'POST', body: { text: importText.value, replace: replace.value } },
    (r) => {
      const parts = Object.entries(r.sections ?? {}).filter(([, n]) => n > 0).map(([s, n]) => `${n} ${SECTION_LABELS[s as DeckSection] ?? s}`)
      return `${r.imported} carte(s) importée(s)${parts.length ? ` (${parts.join(', ')})` : ''}${r.notFound.length ? `, ${r.notFound.length} introuvable(s)` : ''}`
    }
  )
  if (r) {
    importText.value = r.notFound.join('\n')
    if (!r.notFound.length) showImport.value = false
  }
}

async function exportList() {
  const text = await api<string>(`/decklists/${id.value}/export`, { responseType: 'text' })
  await navigator.clipboard.writeText(text)
  show('Liste copiée dans le presse-papier')
}

const storageId = computed(() => deck.value?.storageLocation?.id ?? null)

async function setStorage(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  const storageLocationId = value ? Number(value) : null
  if (!deck.value) return
  await call(
    `/decklists/${id.value}`,
    { method: 'PUT', body: { name: deck.value.name, description: deck.value.description, storageLocationId } },
    () =>
      storageLocationId
        ? `Deck rangé dans « ${locations.value.find((l) => l.id === storageLocationId)?.name ?? ''} », ses exemplaires y ont été déplacés`
        : 'Le deck n’a plus de rangement, ses exemplaires sont retournés à leur place'
  )
}

async function save() {
  await call(`/decklists/${id.value}`, { method: 'PUT', body: form }, () => 'Decklist enregistrée')
  editing.value = false
}

async function removeDeck() {
  if (!confirm('Supprimer cette decklist ? Les exemplaires seront libérés.')) return
  await api(`/decklists/${id.value}`, { method: 'DELETE' })
  await navigateTo('/decklists')
}

const openCardId = ref<string | null>(null)

async function toggleRow(e: Entry) {
  if (openRow.value === rowKey(e)) { openRow.value = null; openCardId.value = null; return }
  openRow.value = rowKey(e)
  openCardId.value = e.card.id
  freeCopies.value = await api<Copy[]>('/copies', { query: { cardId: e.card.id, decklistId: 'none' } })
}

async function assign(copyId: number, decklistId: number | null) {
  await call('/copies', { method: 'PATCH', body: { ids: [copyId], decklistId } })
  if (openCardId.value) freeCopies.value = await api<Copy[]>('/copies', { query: { cardId: openCardId.value, decklistId: 'none' } })
}
</script>

<template>
  <div v-if="deck">
    <NuxtLink to="/decklists" class="back">← Mes decklists</NuxtLink>

    <section class="hero fade-up" style="padding: 1.6rem 1.8rem">
      <div class="hero-inner">
        <div class="stack" style="gap: 0.5rem; flex: 1; min-width: 260px">
          <span class="eyebrow">Decklist</span>
          <template v-if="!editing">
            <h1>{{ deck.name }}</h1>
            <p v-if="deck.description" class="muted" style="white-space: pre-line; margin: 0">{{ deck.description }}</p>
          </template>
          <form v-else class="stack" @submit.prevent="save">
            <label>Nom <input v-model="form.name" /></label>
            <label>Description <textarea v-model="form.description" style="min-height: 4rem; font-family: inherit" /></label>
            <div class="row"><button class="primary">Enregistrer</button><button type="button" class="ghost" @click="editing = false">Annuler</button></div>
          </form>
          <div class="row" style="margin-top: 0.4rem">
            <span v-if="deck.missingCards" class="tag warn">{{ deck.missingCards }} carte{{ deck.missingCards > 1 ? 's' : '' }} manquante{{ deck.missingCards > 1 ? 's' : '' }}</span>
            <span v-else-if="deck.totalCards" class="tag ok">✓ Deck complet</span>
            <span class="tag">{{ deck.totalCards }} cartes</span>
          </div>
          <label class="inline small muted deck-box">
            📦 Rangé dans
            <select :value="storageId ?? ''" @change="setStorage">
              <option value="">Aucun rangement</option>
              <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
            </select>
            <NuxtLink v-if="deck.storageLocation" :to="`/storage/${deck.storageLocation.id}`" class="tiny">voir</NuxtLink>
          </label>
          <span v-if="deck.storageLocation" class="tiny faint">Les exemplaires mis dans ce deck y sont rangés automatiquement, et retournent à leur place quand ils en sortent.</span>
        </div>
        <ProgressRing :value="deck.totalCards ? (deck.assignedCopies / deck.totalCards) * 100 : 0" :size="130" :stroke="10">
          <strong style="font-size: 1.5rem">{{ deck.assignedCopies }}<span class="faint" style="font-size: 0.6em">/{{ deck.totalCards }}</span></strong>
          <div class="tiny muted">en place</div>
        </ProgressRing>
      </div>
    </section>

    <section v-if="deck.legality" class="panel legality fade-up" :class="deck.legality.legal ? 'is-legal' : 'is-illegal'">
      <div class="row between" style="align-items: center">
        <strong class="legality-title">{{ deck.legality.legal ? '✓ Deck légal' : '⚠ Deck non légal' }}</strong>
        <span class="tiny faint">Règles officielles : 40 cartes champion compris (1 + 39), 3 exemplaires max par nom</span>
      </div>
      <div class="legality-chips">
        <span v-for="s in deck.legality.sections" :key="s.section" class="tag" :class="s.ok ? 'ok' : 'danger'">
          {{ SECTION_LABELS[s.section] }} {{ s.min === s.max ? `${s.count}/${s.max}` : `${s.count} (max ${s.max})` }}
        </span>
      </div>
      <ul v-if="deck.legality.issues.length" class="legality-issues small">
        <li v-for="issue in deck.legality.issues" :key="issue">{{ issue }}</li>
      </ul>
    </section>

    <div class="toolbar">
      <button class="primary" @click="autoAssign">✦ Affecter les exemplaires libres</button>
      <button @click="showImport = !showImport">Importer une liste</button>
      <button @click="exportList">Copier la liste</button>
      <span class="spacer" />
      <button class="ghost" @click="release">Libérer les exemplaires</button>
      <button v-if="!editing" class="ghost" @click="editing = true">Renommer</button>
      <button class="ghost danger" @click="removeDeck">Supprimer</button>
    </div>

    <Transition name="page">
      <div v-if="showImport" class="panel stack" style="margin-bottom: 1.2rem">
        <span class="muted small">
          Colle ta liste telle quelle : sections « Legend: », « Champion: », « MainDeck: », « Battlefields: », « Runes: », « Sideboard: »,
          puis une carte par ligne (« 3 Nom de la carte » ou « 2x ID-de-carte »). Sans section, la carte est classée selon son type.
        </span>
        <textarea v-model="importText" placeholder="Legend:&#10;1 Rek'Sai, Void Burrower&#10;&#10;MainDeck:&#10;3 Cleave" style="min-height: 12rem" />
        <div class="row">
          <label class="inline"><input v-model="replace" type="checkbox" /> Remplacer la liste actuelle</label>
          <span class="spacer" />
          <button class="primary" @click="runImport">Importer</button>
        </div>
      </div>
    </Transition>

    <div class="row" style="align-items: flex-start; gap: 0.6rem">
      <div style="flex: 1; min-width: 240px"><CardPicker @pick="addCard" /></div>
      <label class="inline small muted" style="margin-top: 0.4rem">
        Ajouter dans
        <select v-model="pickSection">
          <option value="">Auto (selon le type)</option>
          <option v-for="(label, key) in SECTION_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>
    </div>

    <div v-if="!deck.entries.length" class="empty" style="margin-top: 1.2rem"><div class="icon">🃏</div>La decklist est vide. Ajoute des cartes avec la recherche ou l'import.</div>
    <template v-else>
    <section v-for="g in groups" :key="g.section" class="deck-section fade-up">
      <header class="deck-section-head">
        <h2>{{ g.label }}</h2>
        <span class="tag">{{ g.count }} carte{{ g.count > 1 ? 's' : '' }}</span>
      </header>
      <div class="panel table-wrap">
      <table>
        <thead>
          <tr><th>Carte</th><th>Type</th><th>Quantité</th><th>En place</th><th>Libres</th><th /></tr>
        </thead>
        <tbody>
          <template v-for="e in g.entries" :key="rowKey(e)">
            <tr :class="{ 'deck-row-open': openRow === rowKey(e) }">
              <td>
                <NuxtLink :to="`/cards/${encodeURIComponent(e.card.id)}`" class="card-cell">
                  <img v-if="e.card.thumbnailUrl" :src="e.card.thumbnailUrl" class="thumb" alt="" loading="lazy" />
                  <span class="stack" style="gap: 0">
                    <span style="color: var(--text); font-weight: 500">{{ e.card.name }}</span>
                    <span class="tiny faint">{{ e.card.setId }} #{{ e.card.collectorNumber }}</span>
                  </span>
                </NuxtLink>
              </td>
              <td class="small muted">{{ e.card.type }}</td>
              <td>
                <div class="row" style="gap: 0.35rem; flex-wrap: nowrap">
                  <button class="icon small" @click="setQuantity(e.card.id, e.quantity - 1, e.section)">−</button>
                  <strong style="min-width: 1.2rem; text-align: center">{{ e.quantity }}</strong>
                  <button class="icon small" @click="setQuantity(e.card.id, e.quantity + 1, e.section)">+</button>
                </div>
              </td>
              <td><span class="tag" :class="e.missing ? (e.available ? 'warn' : 'danger') : 'ok'">{{ e.assigned.length }} / {{ e.quantity }}</span></td>
              <td class="small">{{ e.available }}</td>
              <td style="text-align: right"><button class="small" @click="toggleRow(e)">{{ openRow === rowKey(e) ? 'Fermer' : 'Exemplaires' }}</button></td>
            </tr>
            <tr v-if="openRow === rowKey(e)" class="deck-row-open">
              <td colspan="6">
                <div class="stack small" style="padding: 0.3rem 0">
                  <span class="eyebrow">Dans ce deck</span>
                  <div v-if="!e.assigned.length" class="muted">Aucun exemplaire en place.</div>
                  <div v-for="c in e.assigned" :key="c.id" class="copy-line">
                    <span>#{{ c.id }} · {{ c.condition }} · {{ c.language }}</span>
                    <span v-if="c.foil" class="tag foil">FOIL</span>
                    <span class="muted">📦 {{ c.storageLocation?.name ?? 'sans rangement' }}</span>
                    <span class="spacer" />
                    <button class="small ghost" @click="assign(c.id, null)">Retirer du deck</button>
                  </div>
                  <span class="eyebrow" style="margin-top: 0.5rem">Exemplaires libres</span>
                  <div v-if="!freeCopies.length" class="muted">Aucun exemplaire libre.</div>
                  <div v-for="c in freeCopies" :key="c.id" class="copy-line">
                    <span>#{{ c.id }} · {{ c.condition }} · {{ c.language }}</span>
                    <span v-if="c.foil" class="tag foil">FOIL</span>
                    <span class="muted">📦 {{ c.storageLocation?.name ?? 'sans rangement' }}</span>
                    <span class="spacer" />
                    <button class="small primary" :disabled="e.assigned.length >= e.quantity" @click="assign(c.id, deck.id)">Mettre dans le deck</button>
                  </div>
                  <span class="eyebrow" style="margin-top: 0.5rem">Nouvel exemplaire directement dans ce deck</span>
                  <AddCopiesForm :card-id="e.card.id" :decklist-id="deck.id" @added="refresh()" />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      </div>
    </section>
    </template>

    <template v-if="deck.extraCopies.length">
      <h2>Exemplaires affectés hors liste</h2>
      <div class="stack">
        <div v-for="c in deck.extraCopies" :key="c.id" class="copy-line">
          <span>#{{ c.id }} {{ c.card?.name }}</span>
          <span class="muted small">📦 {{ c.storageLocation?.name ?? 'sans rangement' }}</span>
          <span class="spacer" />
          <button class="small" @click="assign(c.id, null)">Libérer</button>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.deck-section { margin-top: 1.4rem; }
.legality { margin-bottom: 1.2rem; display: flex; flex-direction: column; gap: 0.7rem; border-left: 3px solid var(--ok, #4fd18b); }
.legality.is-illegal { border-left-color: var(--danger, #f06a6a); }
.legality-title { font-family: var(--font-display); font-size: 1.05rem; }
.is-legal .legality-title { color: var(--ok, #4fd18b); }
.is-illegal .legality-title { color: var(--danger, #f06a6a); }
.legality-chips { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.legality-issues { margin: 0; padding-left: 1.1rem; color: var(--muted); display: grid; gap: 0.2rem; }
.deck-box { gap: 0.5rem; margin-top: 0.3rem; }
.deck-box select { max-width: 240px; }
.deck-section-head { display: flex; align-items: center; gap: 0.7rem; margin-bottom: 0.55rem; }
.deck-section-head h2 { margin: 0; font-size: 1.15rem; }
@media (min-width: 760px) {
  .deck-section table { table-layout: fixed; width: 100%; }
  .deck-section th:nth-child(1) { width: 34%; }
  .deck-section th:nth-child(2) { width: 13%; }
  .deck-section th:nth-child(3) { width: 16%; }
  .deck-section th:nth-child(4) { width: 12%; }
  .deck-section th:nth-child(5) { width: 9%; }
}
</style>
