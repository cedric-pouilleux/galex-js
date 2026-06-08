/**
 * Public API — Three.js render entry point.
 *
 * Builds on `./sim` (pure data, deterministic) and adds the Three.js render
 * layer: scene composition, layers, effects, closeup, paths, markers and
 * helpers. No Vue or TresJS dependency — suitable for vanilla Three.js
 * consumers or non-Vue frameworks.
 *
 * Vue-specific surface (components, reactive composables) lives in
 * `./index.ts` and augments this entry. For a fully WebGL-free consumption
 * (backend, worker, CLI), import from `./sim` directly.
 */

// ── Pure-logic surface (re-exported transparently) ──────────────
export * from './sim.js';

// ── Scene composition ───────────────────────────────────────────
export { createGalaxyScene } from './view/GalaxyScene.js';
export type { GalaxyScene, GalaxySceneOptions } from './view/GalaxyScene.js';

// ── Layer composer (lower-level than GalaxyScene) ───────────────
export { composeGalaxyLayers } from './view/GalaxyLayersComposer.js';
export type {
  ComposeLayersOptions,
  ComposedGalaxyLayers,
  StarLayer,
  PointsLayer,
  HaloLayer,
  CenterDustLayer,
  VisibilityAwareLayerName,
} from './view/GalaxyLayersComposer.js';

// ── Markers / helpers ───────────────────────────────────────────
export { createCubeMarker } from './view/CubeMarker.js';
export type { CubeMarker, CubeMarkerOptions } from './view/CubeMarker.js';

export {
  createCubeWireframe,
  createOccupiedGridLines,
  createVisibilityFieldLines,
  setThickLineResolution,
} from './view/GridHelper.js';

export { disposeObject3DTree } from './view/Dispose.js';

// ── Closeup primitives (sub-buffer + shader) ────────────────────
export { prepareCloseupField } from './view/closeup/Buffers.js';
export type { CloseupField, CloseupFieldSource, CloseupHighlight } from './view/closeup/Buffers.js';

export { createHoverRing } from './view/closeup/HoverRing.js';
export type { HoverRing } from './view/closeup/HoverRing.js';

export {
  createSelectionRing,
  SELECTION_RING_VERT,
  SELECTION_RING_FRAG,
} from './view/closeup/SelectionRing.js';
export type {
  SelectionRing,
  SelectionRingOptions,
} from './view/closeup/SelectionRing.js';

export { STAR_VERT, STAR_FRAG } from './view/closeup/StarShader.js';

// ── Effects (halo, gas, arms, center, star field…) ──────────────
export { resolveArmCadence, writeSpiralTangent } from './view/effects/ArmCadence.js';
export type { ArmLayerOptions } from './view/effects/ArmCadence.js';

export {
  buildArmGlowBuffers,
  createArmGlowMaterialDef,
} from './view/effects/ArmGlow.js';
export type { ArmGlowBuffers, ArmGlowOptions } from './view/effects/ArmGlow.js';

export {
  buildCenterDustBuffers,
  createCenterDiscGeometry,
  createCenterDiscMaterialDef,
  createCenterDustMaterialDef,
} from './view/effects/CenterDust.js';
export type { CenterDustBuffers, CenterDustOptions } from './view/effects/CenterDust.js';

export {
  buildGasStreaksBuffers,
  createGasStreaksMaterialDef,
} from './view/effects/GasStreaks.js';
export type {
  GasStreaksBuffers,
  GasStreaksOptions,
} from './view/effects/GasStreaks.js';

export { createHaloGeometry, createHaloMaterialDef } from './view/effects/Halo.js';

export {
  buildInnerRingBuffers,
  createInnerRingMaterialDef,
} from './view/effects/InnerRing.js';
export type { InnerRingBuffers, InnerRingOptions } from './view/effects/InnerRing.js';

export {
  buildNebulaeBuffers,
  createNebulaeMaterialDef,
} from './view/effects/Nebulae.js';
export type { NebulaeBuffers, NebulaeOptions } from './view/effects/Nebulae.js';

export {
  createStarFieldMaterialDef,
  createStarFieldVisibility,
} from './view/effects/StarField.js';

export {
  ARM_GLOW_PALETTE,
  CENTER_DISC_FRAG,
  HALO_FRAG,
  HALO_VERT,
  HAZE_PALETTE,
  NEBULA_FRAG,
  NEBULA_PALETTE,
  NEBULA_VERT,
  STREAK_PALETTE,
  STRETCH_FRAG,
  STRETCH_VERT,
  createMaterialFromDef,
  createPointsMaterialDef,
  createStandardPointsUniforms,
  getDevicePixelRatio,
} from './view/effects/Shaders.js';
export type { ShaderMaterialDef } from './view/effects/Shaders.js';

// ── Paths (3D animated trajectories) ────────────────────────────
export { createDashedPath } from './view/paths/DashedPath.js';
export type { DashedPath, DashedPathOptions } from './view/paths/DashedPath.js';
