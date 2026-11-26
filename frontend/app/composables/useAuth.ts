export interface AuthUser {
  id: number
  fullName: string | null
  email: string
  initials: string
  isAdmin: boolean
}

export function useAuth() {
  // Même cookie que celui utilisé par le client HTTP (plugins/api.ts)
  const token = useNuxtApp().$authToken as Ref<string | null>
  const user = useState<AuthUser | null>('auth-user', () => null)

  async function fetchUser() {
    if (!token.value) {
      user.value = null
      return null
    }
    try {
      const res = await api<{ data: AuthUser }>('/account/profile')
      user.value = res.data
    } catch {
      user.value = null
    }
    return user.value
  }

  async function authenticate(path: string, body: Record<string, unknown>) {
    let res: { data: { user: AuthUser; token: string } }
    try {
      res = await api(path, { method: 'POST', body })
    } catch (e) {
      const status = (e as { status?: number }).status
      if (status === 400) throw new Error('E-mail ou mot de passe incorrect')
      throw e
    }
    token.value = res.data.token
    user.value = res.data.user
    useRefs().locations.value = []
    useRefs().decklists.value = []
  }

  const login = (email: string, password: string) => authenticate('/auth/login', { email, password })

  const signup = (data: { fullName?: string; email: string; password: string; passwordConfirmation: string }) =>
    authenticate('/auth/signup', data)

  async function logout() {
    try {
      await api('/account/logout', { method: 'POST' })
    } catch {
      // jeton déjà invalide : rien à faire
    }
    token.value = null
    user.value = null
    await navigateTo('/login')
  }

  return { token, user, fetchUser, login, signup, logout }
}
