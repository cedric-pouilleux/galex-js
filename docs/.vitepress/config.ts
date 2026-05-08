import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Stellex Galaxy',
  description: 'Procedural deterministic galaxy library',
  lang: 'fr-FR',
  base: '/',
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: 'Accueil', link: '/' },
      { text: 'Quick start', link: '/quick-start' },
      { text: 'Architecture', link: '/architecture/' },
      { text: 'API', link: '/api/' },
      { text: 'Compatibilité', link: '/compatibility/' },
      { text: 'Primitives', link: '/primitives/' },
      { text: 'Intégrations', link: '/integrations/vue-tres' },
    ],
    sidebar: {
      '/architecture/': [
        {
          text: 'Architecture',
          items: [
            { text: 'Vue d\'ensemble', link: '/architecture/' },
          ],
        },
      ],
      '/compatibility/': [
        {
          text: 'Compatibilité',
          items: [
            { text: 'Vue d\'ensemble', link: '/compatibility/' },
            { text: 'Côté serveur', link: '/compatibility/server-side' },
            { text: 'Math déterministe', link: '/compatibility/deterministic-math' },
            { text: 'Vérification', link: '/compatibility/verification' },
          ],
        },
      ],
      '/primitives/': [
        {
          text: 'Primitives de plateau',
          items: [
            { text: 'Vue d\'ensemble', link: '/primitives/' },
            { text: 'CubeMarker', link: '/primitives/cube-marker' },
            { text: 'Visibility field', link: '/primitives/visibility-field' },
            { text: 'Closeup', link: '/primitives/closeup' },
          ],
        },
      ],
      '/integrations/': [
        {
          text: 'Intégrations',
          items: [
            { text: 'Vue / TresJS', link: '/integrations/vue-tres' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Référence API',
          items: [
            { text: 'Vue d\'ensemble', link: '/api/' },
            { text: 'createGalaxyData', link: '/api/galaxy-data' },
            { text: 'createGalaxyScene', link: '/api/galaxy-scene' },
            { text: 'useGalaxyLayers', link: '/api/use-galaxy-layers' },
            { text: 'useGalaxyView', link: '/api/use-galaxy-view' },
          ],
        },
      ],
    },
    socialLinks: [],
  },
});
