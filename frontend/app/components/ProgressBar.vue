<script setup lang="ts">
const props = defineProps<{ value: number }>()
const width = computed(() => `${Math.min(100, Math.max(0, props.value))}%`)
</script>

<template>
  <div class="progress" :class="{ ok: value >= 100 }"><span :style="{ width }" /></div>
</template>
