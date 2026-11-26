import { setClientApi, TOKEN_COOKIE } from '~/composables/useApi'

/**
 * Client HTTP vers l'API AdonisJS : ajoute le jeton de connexion et renvoie
 * vers la page de connexion si la session a expiré.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const token = useCookie<string | null>(TOKEN_COOKIE, { maxAge: 60 * 60 * 24 * 30, sameSite: 'lax' })

  const $api = $fetch.create({
    baseURL: '/api/v1',
    onRequest({ options }) {
      if (token.value) {
        const headers = new Headers(options.headers as HeadersInit | undefined)
        headers.set('Authorization', `Bearer ${token.value}`)
        options.headers = headers
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401 && token.value) {
        token.value = null
        await nuxtApp.runWithContext(() => navigateTo('/login'))
      }
    },
  })

  if (import.meta.client) setClientApi($api)

  return { provide: { api: $api, authToken: token } }
})
