const PUBLIC_PAGES = ['/login', '/signup']

export default defineNuxtRouteMiddleware(async (to) => {
  const { token, user, fetchUser } = useAuth()
  const isPublic = PUBLIC_PAGES.includes(to.path)

  if (token.value && !user.value) await fetchUser()

  if (!user.value && !isPublic) {
    return navigateTo({ path: '/login', query: to.fullPath !== '/' ? { redirect: to.fullPath } : {} })
  }
  if (user.value && isPublic) return navigateTo('/')
})
