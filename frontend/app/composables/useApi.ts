export const TOKEN_COOKIE = 'stackr_token'

type ApiFetch = typeof $fetch
let clientApi: ApiFetch | null = null

export function setClientApi(instance: ApiFetch) {
  clientApi = instance
}

/**
 * Appel à l'API AdonisJS (préfixe /api/v1 ajouté automatiquement, jeton inclus)
 */
export function api<T = unknown>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
  const instance = (import.meta.client && clientApi) || (useNuxtApp().$api as ApiFetch)
  return instance<T>(path, options as any) as Promise<T>
}

/**
 * useFetch branché sur l'API (rendu serveur compris)
 */
export function useApiFetch<T>(path: string | (() => string), options: Record<string, unknown> = {}) {
  return useFetch<T>(path as string, { ...options, $fetch: useNuxtApp().$api as ApiFetch } as any)
}

export function apiError(error: unknown): string {
  const e = error as { data?: { message?: string; errors?: { message: string }[] }; message?: string }
  return e?.data?.errors?.[0]?.message ?? e?.data?.message ?? e?.message ?? 'Erreur inconnue'
}

/**
 * Petite notification globale
 */
export function useToast() {
  const toast = useState<{ text: string; kind: 'ok' | 'error' } | null>('toast', () => null)
  let timer: ReturnType<typeof setTimeout> | undefined
  function show(text: string, kind: 'ok' | 'error' = 'ok') {
    toast.value = { text, kind }
    clearTimeout(timer)
    timer = setTimeout(() => (toast.value = null), 3500)
  }
  return { toast, show }
}

/**
 * Listes de référence partagées (rangements et decklists) pour les sélecteurs
 */
export function useRefs() {
  const locations = useState<{ id: number; name: string }[]>('ref-locations', () => [])
  const decklists = useState<{ id: number; name: string }[]>('ref-decklists', () => [])
  async function refresh() {
    const [l, d] = await Promise.all([
      api<{ locations: { id: number; name: string }[] }>('/storage-locations'),
      api<{ id: number; name: string }[]>('/decklists'),
    ])
    locations.value = l.locations
    decklists.value = d
  }
  return { locations, decklists, refresh }
}
