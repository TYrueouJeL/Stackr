<script setup lang="ts">
import type { StorageLocation } from '~/utils/types'

const { data, refresh } = await useApiFetch<{ locations: StorageLocation[]; unassigned: number }>('/storage-locations')
const form = reactive({ name: '', description: '' })
const { show } = useToast()

async function create() {
  if (!form.name.trim()) return
  try {
    await api('/storage-locations', { method: 'POST', body: form })
    form.name = ''
    form.description = ''
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
      <input v-model="form.description" placeholder="Description (optionnel)" style="flex: 2 1 260px" />
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
        <div class="box-icon">📦</div>
        <div class="stack" style="gap: 0.2rem; min-width: 0">
          <span class="name">{{ l.name }}</span>
          <span v-if="l.description" class="small muted ellipsis">{{ l.description }}</span>
          <span class="tiny faint">{{ l.copies }} exemplaire{{ l.copies > 1 ? 's' : '' }}</span>
          <span v-if="l.decklists?.length" class="tiny muted ellipsis">🃏 {{ l.decklists.map((d) => d.name).join(', ') }}</span>
        </div>
      </NuxtLink>
      <NuxtLink to="/storage/none" class="panel box-tile fade-up" style="border-style: dashed">
        <div class="box-icon" style="filter: grayscale(1); opacity: 0.6">🗃️</div>
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
