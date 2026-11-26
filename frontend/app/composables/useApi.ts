const BASE = '/api/v1'

/**
 * Appels à l'API AdonisJS (relayée par Nuxt sur /api)
 */
export function api<T = unknown>(path: string, options: Parameters<typeof $fetch>[1] = {}) {
  return $fetch<T>(`${BASE}${path}`, options as any)
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
