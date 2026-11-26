<script setup lang="ts">
import type { Copy } from '~/utils/types'

const route = useRoute()
const isNone = computed(() => route.params.id === 'none')
const { locations, refresh: refreshRefs } = useRefs()
const { show } = useToast()
onMounted(() => refreshRefs())

const { data, refresh } = await useAsyncData(
  () => `storage-${route.params.id}`,
  async () => {
    if (isNone.value) {
      const copies = await api<Copy[]>('/copies', { query: { storageLocationId: 'none' } })
      return { id: null as number | null, name: 'Sans rangement', description: null as string | null, copies }
    }
    return api<{ id: number; name: string; description: string | null; copies: Copy[] }>(`/storage-locations/${route.params.id}`)
  }
)

const q = ref('')
const selected = ref(new Set<number>())
const target = ref<number | null>(null)
const editing = ref(false)
const form = reactive({ name: '', description: '' })

const copies = computed(() =>
  (data.value?.copies ?? []).filter((c) => !q.value || c.card?.name.toLowerCase().includes(q.value.toLowerCase()))
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
  editing.value = true
}
async function save() {
  await api(`/storage-locations/${route.params.id}`, { method: 'PUT', body: form })
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
        <span class="eyebrow">Rangement</span>
        <template v-if="!editing">
          <h1>{{ data.name }}</h1>
          <span v-if="data.description" class="muted">{{ data.description }}</span>
        </template>
        <form v-else class="row" @submit.prevent="save">
          <input v-model="form.name" placeholder="Nom" />
          <input v-model="form.description" placeholder="Description" />
          <button class="primary">Enregistrer</button>
          <button type="button" class="ghost" @click="editing = false">Annuler</button>
        </form>
      </div>
      <div v-if="!isNone && !editing" class="row">
        <button class="ghost" @click="startEdit">Modifier</button>
        <button class="ghost danger" @click="remove">Supprimer</button>
      </div>
    </div>

    <div class="toolbar">
      <SearchInput v-model="q" placeholder="Filtrer par nom" />
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
