<script setup lang="ts">
import { POCKET_LAYOUTS, STORAGE_KINDS, type Copy, type StorageKind } from '~/utils/types'

type StorageDetail = {
  id: number | null
  name: string
  description: string | null
  kind: StorageKind | null
  pocketsPerPage: number | null
  pageCount: number | null
  decklists: { id: number; name: string }[]
  copies: Copy[]
}

const route = useRoute()
const isNone = computed(() => route.params.id === 'none')
const { locations, refresh: refreshRefs } = useRefs()
const { show } = useToast()
onMounted(() => refreshRefs())

const { data, refresh } = await useAsyncData(
  () => `storage-${route.params.id}`,
  async (): Promise<StorageDetail> => {
    if (isNone.value) {
      const copies = await api<Copy[]>('/copies', { query: { storageLocationId: 'none' } })
      return { id: null, name: 'Sans rangement', description: null, kind: null, pocketsPerPage: null, pageCount: null, decklists: [], copies }
    }
    return api<StorageDetail>(`/storage-locations/${route.params.id}`)
  }
)

const q = ref('')
const selected = ref(new Set<number>())
const target = ref<number | null>(null)
const editing = ref(false)
const form = reactive({ name: '', description: '', kind: 'box' as StorageKind, pocketsPerPage: 9, pageCount: 10 })
const isBinder = computed(() => data.value?.kind === 'binder' && !!data.value.pocketsPerPage && !!data.value.pageCount)

const copies = computed(() =>
  (data.value?.copies ?? []).filter((c) => !q.value || (!!c.card && matchesCard(c.card, q.value)))
)

function toggle(id: number) {
  const s = new Set(selected.value)
  s.has(id) ? s.delete(id) : s.add(id)
  selected.value = s
}
function toggleAll() {
  selected.value = selected.value.size === copies.value.length ? new Set() : new Set(copies.value.map((c) => c.id))
}

async function move() {
  if (!selected.value.size) return
  await api('/copies', { method: 'PATCH', body: { ids: [...selected.value], storageLocationId: target.value } })
  show(`${selected.value.size} exemplaire(s) déplacé(s)`)
  selected.value = new Set()
  await refresh()
}

function startEdit() {
  form.name = data.value?.name ?? ''
  form.description = data.value?.description ?? ''
  form.kind = data.value?.kind ?? 'box'
  form.pocketsPerPage = data.value?.pocketsPerPage ?? 9
  form.pageCount = data.value?.pageCount ?? 10
  editing.value = true
}
async function save() {
  try {
    await api(`/storage-locations/${route.params.id}`, { method: 'PUT', body: form })
  } catch (e) {
    show(apiError(e), 'error')
    return
  }
  editing.value = false
  await refresh()
}
async function remove() {
  if (!confirm('Supprimer ce rangement ? Ses exemplaires passeront en « sans rangement ».')) return
  await api(`/storage-locations/${route.params.id}`, { method: 'DELETE' })
  await navigateTo('/storage')
}
</script>

<template>
  <div v-if="data">
    <NuxtLink to="/storage" class="back">← Mes rangements</NuxtLink>
    <div class="page-head">
      <div class="stack" style="flex: 1">
        <span class="eyebrow">{{ data.kind ? `${STORAGE_KINDS[data.kind].icon} ${STORAGE_KINDS[data.kind].label}` : 'Rangement' }}<template v-if="isBinder"> · {{ data.pageCount }} pages de {{ data.pocketsPerPage }} pochettes</template></span>
        <template v-if="!editing">
          <h1>{{ data.name }}</h1>
          <span v-if="data.description" class="muted">{{ data.description }}</span>
          <span v-if="data.decklists.length" class="small muted">
            Deck box de
            <template v-for="(d, i) in data.decklists" :key="d.id"><template v-if="i">, </template><NuxtLink :to="`/decklists/${d.id}`">{{ d.name }}</NuxtLink></template>
          </span>
        </template>
        <form v-else class="row" @submit.prevent="save">
          <input v-model="form.name" placeholder="Nom" />
          <input v-model="form.description" placeholder="Description" />
          <select v-model="form.kind">
            <option v-for="(k, key) in STORAGE_KINDS" :key="key" :value="key">{{ k.icon }} {{ k.label }}</option>
          </select>
          <template v-if="form.kind === 'binder'">
            <label class="inline small">Pochettes / page
              <select v-model.number="form.pocketsPerPage"><option v-for="n in POCKET_LAYOUTS" :key="n" :value="n">{{ n }}</option></select>
            </label>
            <label class="inline small">Pages <input v-model.number="form.pageCount" type="number" min="1" max="1000" style="width: 5rem" /></label>
          </template>
          <button class="primary">Enregistrer</button>
          <button type="button" class="ghost" @click="editing = false">Annuler</button>
        </form>
      </div>
      <div v-if="!isNone && !editing" class="row">
        <button class="ghost" @click="startEdit">Modifier</button>
        <button class="ghost danger" @click="remove">Supprimer</button>
      </div>
    </div>

    <BinderView
      v-if="isBinder"
      :binder-id="data.id!"
      :pockets-per-page="data.pocketsPerPage!"
      :page-count="data.pageCount!"
      :copies="data.copies"
      @changed="refresh()"
    />

    <div class="toolbar">
      <SearchInput v-model="q" placeholder="Filtrer par nom ou numéro (OGN 209)" />
      <span class="tiny muted">{{ copies.length }} exemplaire{{ copies.length > 1 ? 's' : '' }}</span>
    </div>

    <Transition name="page">
      <div v-if="selected.size" class="panel glow row" style="margin-bottom: 1.2rem; position: sticky; top: 76px; z-index: 5; background: rgba(18, 22, 40, 0.95)">
        <strong>{{ selected.size }} sélectionné{{ selected.size > 1 ? 's' : '' }}</strong>
        <span class="muted">→ déplacer vers</span>
        <select v-model="target">
          <option :value="null">Sans rangement</option>
          <option v-for="l in locations" :key="l.id" :value="l.id">{{ l.name }}</option>
        </select>
        <button class="primary" @click="move">Déplacer</button>
        <span class="spacer" />
        <button class="ghost small" @click="selected = new Set()">Désélectionner</button>
      </div>
    </Transition>

    <div v-if="!copies.length" class="empty"><div class="icon">📭</div>Aucun exemplaire ici.</div>
    <div v-else class="panel table-wrap">
      <table>
        <thead>
          <tr>
            <th><input type="checkbox" :checked="selected.size === copies.length" @change="toggleAll" /></th>
            <th>N°</th><th>Carte</th><th>Rangement</th><th>Decklist</th><th>État</th><th>Foil</th><th>Langue</th><th />
          </tr>
        </thead>
        <tbody>
          <CopyRow v-for="c in copies" :key="c.id" :copy="c" show-card selectable :selected="selected.has(c.id)" @toggle="toggle" @changed="refresh()" />
        </tbody>
      </table>
    </div>
  </div>
</template>
