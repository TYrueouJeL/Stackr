// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  devtools: { enabled: true },
  css: ['~/assets/main.css'],
  app: {
    head: {
      title: 'Stackr · Riftbound',
      htmlAttrs: { lang: 'fr' },
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  // Toutes les requêtes /api/** sont relayées vers le backend AdonisJS
  routeRules: {
    '/api/**': { proxy: `${process.env.NUXT_API_URL ?? 'http://localhost:3333'}/api/**` },
  },
})
