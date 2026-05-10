import { defineConfig } from 'vitepress';
import { templateCompilerOptions } from '@tresjs/core';

export default defineConfig({
  title: 'GalexJS',
  description: 'Procedural deterministic galaxy library',
  lang: 'fr-FR',
  base: '/',
  cleanUrls: true,

  // Forwarded to @vitejs/plugin-vue. TresJS uses a custom-element whitelist so
  // `<TresPoints>`, `<TresMesh>` etc. compile to its own resolver while real
  // Vue components like `<TresCanvas>` go through the normal pipeline.
  vue: templateCompilerOptions,

  themeConfig: {
    nav: [
      { text: 'Accueil', link: '/' },
      { text: 'Quick start', link: '/quick-start' },
      { text: 'Galerie', link: '/examples/' },
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
        {
          text: 'Compositions sandbox',
          items: [
            { text: 'PaintSelection', link: '/primitives/paint-selection' },
            { text: 'MeasureTool', link: '/primitives/measure-tool' },
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
      '/examples/': [
        {
          text: 'Galerie',
          items: [
            { text: 'Vue d\'ensemble', link: '/examples/' },
            { text: 'Variations d\'options', link: '/examples/options' },
            { text: 'Modes de vue', link: '/examples/views' },
            { text: 'Primitives en action', link: '/examples/primitives' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'Référence API',
          items: [
            { text: 'Vue d\'ensemble', link: '/api/' },
            { text: 'createGalaxyData', link: '/api/galaxy-data' },
            { text: 'starNeighbors', link: '/api/star-neighbors' },
            { text: 'Astronomy', link: '/api/astronomy' },
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
