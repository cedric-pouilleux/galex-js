// Public Vue/TresJS entry point. The two main exports are:
//   - `useGalaxyLayers(galaxyData, opts?)` — composable yielding the buffer +
//     material defs needed by a TresJS template, reactive on the input.
//   - `<GalaxyScene>` — drop-in component that wires those layers into a
//     `<TresGroup>` ready to be added to any TresJS canvas.
//
// The lib stays domain-neutral on the Vue side: nothing in here knows about
// players, fleets, fog of war, etc. — composers wrap and add markers around
// these primitives.

export { useGalaxyLayers } from './composables/UseGalaxyLayers.js';
export type {
  GalaxyLayers,
  GalaxyLayersOptions,
  StarLayer,
  PointsLayer,
  HaloLayer,
  CenterDustLayer,
} from './composables/UseGalaxyLayers.js';

export { useGalaxyView } from './composables/UseGalaxyView.js';
export type {
  GalaxyViewControls,
  GalaxyViewHandle,
  ClippingState,
} from './composables/UseGalaxyView.js';

export { default as GalaxyScene } from './components/GalaxyScene.vue';
