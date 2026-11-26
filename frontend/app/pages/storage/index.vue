<script setup lang="ts">
import { POCKET_LAYOUTS, STORAGE_KINDS, type StorageKind, type StorageLocation } from '~/utils/types'

const { data, refresh } = await useApiFetch<{
  locations: StorageLocation[]
  unassigned: number
  unassignedPreview: { name: string; imageUrl: string }[]
}>('/storage-locations')
const form = reactive({ name: '', description: '', kind: 'box' as StorageKind, pocketsPerPage: 9, pageCount: 10 })
const { show } = useToast()

async function create() {
  if (!form.name.trim()) return
  try {
    await api('/storage-locations', { method: 'POST', body: form })
    form.name = ''
    form.description = ''
    form.kind = 'box'
    show('Rangement créé')
    await refresh()
  } catch (e) {
    show(apiError(e), 'error')
  }
}
</script>

<template>
  <div>
    <div class="page-head">
      <div class="stack">
        <span class="eyebrow">Organisation</span>
        <h1>Mes rangements</h1>
      </div>
    </div>

    <form class="toolbar" @submit.prevent="create">
      <input v-model="form.name" placeholder="Nom (ex : Classeur Origins, Boîte bulk…)" style="flex: 1 1 220px" />
      <input v-model="form.description" placeholder="Description (optionnel)" style="flex: 2 1 220px" />
      <select v-model="form.kind">
        <option v-for="(k, key) in STORAGE_KINDS" :key="key" :value="key">{{ k.icon }} {{ k.label }}</option>
      </select>
      <template v-if="form.kind === 'binder'">
        <label class="inline small muted">Pochettes / page
          <select v-model.number="form.pocketsPerPage"><option v-for="n in POCKET_LAYOUTS" :key="n" :value="n">{{ n }}</option></select>
        </label>
        <label class="inline small muted">Pages <input v-model.number="form.pageCount" type="number" min="1" max="1000" style="width: 5rem" /></label>
      </template>
      <button class="primary">+ Créer</button>
    </form>

    <div class="grid sets">
      <NuxtLink
        v-for="(l, i) in data?.locations"
        :key="l.id"
        :to="`/storage/${l.id}`"
        class="panel box-tile fade-up"
        :style="{ animationDelay: `${i * 50}ms` }"
      >
        <div class="box-preview" :class="{ empty: !l.preview?.length }">
          <img v-for="(p, j) in l.preview" :key="p.imageUrl" :src="p.imageUrl" :alt="p.name" loading="lazy" :class="`fan-${j}-of-${l.preview.length}`" />
          <span v-if="!l.preview?.length" class="box-preview-icon">{{ STORAGE_KINDS[l.kind ?? 'box'].icon }}</span>
        </div>
        <div class="stack" style="gap: 0.2rem; min-width: 0">
          <span class="tiny kind">{{ STORAGE_KINDS[l.kind ?? 'box'].icon }} {{ STORAGE_KINDS[l.kind ?? 'box'].label }}<template v-if="l.kind === 'binder'"> · {{ l.pageCount }} p. × {{ l.pocketsPerPage }}</template></span>
          <span class="name">{{ l.name }}</span>
          <span v-if="l.description" class="small muted ellipsis">{{ l.description }}</span>
          <span class="tiny faint">{{ l.copies }} exemplaire{{ l.copies > 1 ? 's' : '' }}</span>
          <span v-if="l.decklists?.length" class="tiny muted ellipsis">🃏 {{ l.decklists.map((d) => d.name).join(', ') }}</span>
        </div>
      </NuxtLink>
      <NuxtLink to="/storage/none" class="panel box-tile fade-up" style="border-style: dashed">
        <div class="box-preview" :class="{ empty: !data?.unassignedPreview?.length }" style="filter: saturate(0.5)">
          <img v-for="(p, j) in data?.unassignedPreview ?? []" :key="p.imageUrl" :src="p.imageUrl" :alt="p.name" loading="lazy" :class="`fan-${j}-of-${data!.unassignedPreview.length}`" />
          <span v-if="!data?.unassignedPreview?.length" class="box-preview-icon">🗃️</span>
        </div>
        <div class="stack" style="gap: 0.2rem">
          <span class="name">Sans rangement</span>
          <span class="tiny faint">{{ data?.unassigned ?? 0 }} exemplaire{{ (data?.unassigned ?? 0) > 1 ? 's' : '' }} à ranger</span>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.box-tile { display: flex !important; gap: 1rem; align-items: center; }
.box-tile .name { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; }
.kind { color: var(--gold); letter-spacing: 0.04em; }
.box-tile { min-height: 150px; }
.box-preview {
  position: relative;
  width: 118px;
  height: 120px;
  flex: none;
}
.box-preview.empty {
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(227, 180, 95, 0.16), rgba(141, 108, 247, 0.12));
  border: 1px solid var(--border);
}
.box-preview-icon { font-size: 2rem; }
.box-preview img {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 72px;
  aspect-ratio: 744 / 1039;
  object-fit: cover;
  border-radius: 6px;
  box-shadow: 0 10px 18px -6px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.12);
  transform-origin: 50% 110%;
  transition: transform 0.35s var(--ease);
}
.box-preview img.fan-0-of-1 { transform: translateX(-50%); }
.box-preview img.fan-0-of-2 { transform: translateX(-50%) rotate(-8deg); }
.box-preview img.fan-1-of-2 { transform: translateX(-50%) rotate(8deg); }
.box-preview img.fan-0-of-3 { transform: translateX(-50%) rotate(-14deg); }
.box-preview img.fan-1-of-3 { transform: translateX(-50%); z-index: 1; }
.box-preview img.fan-2-of-3 { transform: translateX(-50%) rotate(14deg); }
.box-tile:hover .box-preview img.fan-0-of-3 { transform: translateX(-50%) rotate(-20deg); }
.box-tile:hover .box-preview img.fan-2-of-3 { transform: translateX(-50%) rotate(20deg); }
.box-icon {
  width: 54px;
  height: 54px;
  flex: none;
  display: grid;
  place-items: center;
  font-size: 1.6rem;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(227, 180, 95, 0.2), rgba(141, 108, 247, 0.15));
  border: 1px solid var(--border);
}
.ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
