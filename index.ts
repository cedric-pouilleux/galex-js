/**
 * Public API — Vue / TresJS entry point.
 *
 * Re-exports the Three.js render surface from `./core` and augments it with
 * the Vue-coupled additions: reactive composables and drop-in components.
 *
 * For a Vue-free consumption (vanilla Three.js, other frameworks), import
 * from `./core` directly. For a fully WebGL-free consumption (backend,
 * worker, CLI), import from `./sim`.
 */

// ── Three.js render surface (transparently re-exported) ─────────
export * from './core.js';

// ── Composables ─────────────────────────────────────────────────
export { useGalaxyLayers } from './view-vue/composables/UseGalaxyLayers.js';
export type {
  GalaxyLayers,
  GalaxyLayersOptions,
} from './view-vue/composables/UseGalaxyLayers.js';

export { useGalaxyView } from './view-vue/composables/UseGalaxyView.js';
export type {
  ClippingState,
  GalaxyViewControls,
  GalaxyViewHandle,
} from './view-vue/composables/UseGalaxyView.js';

// ── Drop-in component ───────────────────────────────────────────
export { default as GalaxyScene } from './view-vue/components/GalaxyScene.vue';
