<script setup lang="ts">
const { toast } = useToast()
const { user, logout } = useAuth()
const route = useRoute()
const links = [
  { to: '/', label: 'Masterset', match: (p: string) => p === '/' || p.startsWith('/sets') },
  { to: '/cards', label: 'Cartes', match: (p: string) => p.startsWith('/cards') },
  { to: '/decklists', label: 'Decklists', match: (p: string) => p.startsWith('/decklists') },
  { to: '/storage', label: 'Rangements', match: (p: string) => p.startsWith('/storage') },
]
const initials = computed(() => {
  const source = user.value?.fullName || user.value?.email || '?'
  return source
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
})
</script>

<template>
  <div>
    <nav class="nav">
      <div class="inner">
        <NuxtLink to="/" class="brand"><Logo /> STACKR</NuxtLink>
        <template v-if="user">
          <div class="nav-links">
            <NuxtLink v-for="l in links" :key="l.to" :to="l.to" :class="{ active: l.match(route.path) }">{{ l.label }}</NuxtLink>
          </div>
          <span class="spacer" />
          <div class="user-chip">
            <span class="avatar">{{ initials }}</span>
            <span class="name small" :title="user.email">{{ user.fullName || user.email }}</span>
            <button class="ghost small" title="Se déconnecter" @click="logout">Déconnexion</button>
          </div>
        </template>
      </div>
    </nav>
    <main class="container">
      <NuxtPage />
    </main>
    <Transition name="toast">
      <div v-if="toast" class="toast" :class="toast.kind">
        <span>{{ toast.kind === 'error' ? '⚠️' : '✨' }}</span>{{ toast.text }}
      </div>
    </Transition>
  </div>
</template>
