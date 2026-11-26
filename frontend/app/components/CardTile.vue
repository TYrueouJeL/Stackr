<script setup lang="ts">
import type { Card } from '~/utils/types'

defineProps<{ card: Card; count?: number; label?: string }>()
</script>

<template>
  <NuxtLink :to="`/cards/${encodeURIComponent(card.id)}`" class="card-tile" :class="{ missing: (count ?? card.owned ?? 0) === 0 }">
    <div class="img">
      <img v-if="card.thumbnailUrl" :src="card.thumbnailUrl" :alt="card.name" loading="lazy" />
      <span v-else>{{ card.name }}</span>
    </div>
    <span class="count">{{ label ?? (count ?? card.owned ?? 0) }}</span>
    <div class="meta">
      <div><strong>{{ card.name }}</strong></div>
      <div class="muted small">#{{ card.collectorNumber ?? '?' }} · {{ card.rarity ?? '—' }}</div>
    </div>
  </NuxtLink>
</template>
