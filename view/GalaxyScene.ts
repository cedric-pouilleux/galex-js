import * as THREE from 'three';
import { createStarField } from './effects/StarField.js';
import { createNebulae } from './effects/Nebulae.js';
import { createHalo } from './effects/Halo.js';
import { createGasStreaks } from './effects/GasStreaks.js';
import { createArmGlow } from './effects/ArmGlow.js';
import { createCenterDust } from './effects/CenterDust.js';
import { createInnerRing } from './effects/InnerRing.js';
import { getDevicePixelRatio } from './effects/Shaders.js';
import type { CenterDust } from './effects/CenterDust.js';
import { mulberry32, deriveSubseed } from '../core/Random.js';
import { computeVisibilityField } from '../core/Visibility.js';
import type { GalaxyData } from '../core/GalaxyData.js';
import type { VisibilityFieldConfig } from '../core/Visibility.js';

/** View-only options. Drive the visual layers without affecting `GalaxyData`. */
export type GalaxySceneOptions = {
  /** Multiplier for gas streaks, haze and nebula counts. */
  gasDensity?: number;
};

export type GalaxyScene = {
  readonly object3D: THREE.Group;
  /** Multiplies the global dim uniform on every layer (stars + halo + gas). */
  setDimming(factor: number): void;
  /** Multiplies the dim uniform on the gas-only layers (arm glow, streaks, nebulae, inner ring, center dust). */
  setGasDim(factor: number): void;
  /** Toggles the soft halo behind the disk. */
  setHaloVisible(visible: boolean): void;
  setOrthoSize(zoom: number): void;
  setClipping(active: boolean, normal?: THREE.Vector3, point?: THREE.Vector3): void;
  setVisibilityField(config: VisibilityFieldConfig | null): void;
  dispose(): void;
};

type OrthoLayer = { material: THREE.ShaderMaterial; factor: number };

function setUniform(mat: THREE.ShaderMaterial, name: string, value: number): void {
  if (mat.uniforms[name]) mat.uniforms[name].value = value;
}

/**
 * Three.js view bound to a {@link GalaxyData}. Builds and owns every renderable
 * layer (stars, halo, arm glow, gas streaks, nebulae, inner ring, center dust)
 * and exposes the per-frame controls (dimming, ortho size, clipping plane,
 * visibility field).
 *
 * `dispose()` releases all GPU resources; the underlying `GalaxyData` survives.
 */
export function createGalaxyScene(galaxyData: GalaxyData, viewOpts: GalaxySceneOptions = {}): GalaxyScene {
  const { gasDensity = 1.0 } = viewOpts;
  const { seed, armSpinJ, armPhaseJ, data, opts } = galaxyData;
  const { radius, innerRadius, arms, spin, fillCenter } = opts;

  // Render-side rng streams. They never touch `data` so they can use independent
  // subseed labels without disturbing the deterministic chain.
  const armGlowRng = mulberry32(deriveSubseed(seed, 'arm-glow'));
  const gasRng     = mulberry32(deriveSubseed(seed, 'gas-streaks'));
  const nebulaeRng = mulberry32(deriveSubseed(seed, 'nebulae'));

  const field = createStarField({
    positions: data.positions,
    colors: data.colors,
    sizes: data.sizes,
    pixelRatio: getDevicePixelRatio(),
  });

  const root = new THREE.Group();
  root.add(field);

  const halo = createHalo({ radius, color: 0xc8d4ee, intensity: 0.06 });
  root.add(halo);

  const armGlow = createArmGlow({
    radius, innerRadius, arms, spin, armSpinJ, armPhaseJ, rng: armGlowRng,
  });
  root.add(armGlow);

  const gasStreaks = createGasStreaks({
    radius, innerRadius, arms, spin, armSpinJ, armPhaseJ, rng: gasRng,
    streaks: Math.max(0, Math.round(220 * gasDensity)),
    hazeClouds: Math.max(0, Math.round(80 * gasDensity)),
  });
  root.add(gasStreaks);

  const nebulae = createNebulae({
    radius, innerRadius, arms, spin, armSpinJ, armPhaseJ, rng: nebulaeRng,
    clusters: Math.max(0, Math.round(32 * gasDensity)),
  });
  root.add(nebulae);

  // Inner ring acts as a chromatic bridge between the bulb and the arms.
  const innerRing = createInnerRing({
    innerRadius, radius, arms, spin, armSpinJ, armPhaseJ,
    density: gasDensity,
    rng: mulberry32(deriveSubseed(seed, 'inner-ring')),
  });
  root.add(innerRing);

  // Center bulge only makes sense visually when the core is populated; otherwise
  // it would be a glowing ball in the void.
  let centerDust: CenterDust | null = null;
  if (fillCenter) {
    centerDust = createCenterDust({
      innerRadius, radius, arms, spin, armSpinJ, armPhaseJ,
      color: 0xffc580,
      intensity: 0.45 * Math.max(0.4, gasDensity),
      dustParticles: Math.max(0, Math.round(1400 * gasDensity)),
      rng: mulberry32(deriveSubseed(seed, 'center-dust')),
    });
    root.add(centerDust.object3D);
  }

  // Cast each material once — the per-setter fan-out below stays cast-free.
  const fieldMat      = field.material      as THREE.ShaderMaterial;
  const haloMat       = halo.material       as THREE.ShaderMaterial;
  const armGlowMat    = armGlow.material    as THREE.ShaderMaterial;
  const gasStreaksMat = gasStreaks.material as THREE.ShaderMaterial;
  const nebulaeMat    = nebulae.material    as THREE.ShaderMaterial;
  const innerRingMat  = innerRing.material  as THREE.ShaderMaterial;

  // Concern groups: one list per setter. setDimming = field + halo + gas.
  const gasMaterials: THREE.ShaderMaterial[] = [armGlowMat, gasStreaksMat, nebulaeMat, innerRingMat];
  if (centerDust) gasMaterials.push(centerDust.discMaterial, centerDust.dustMaterial);
  const dimMaterials: THREE.ShaderMaterial[] = [fieldMat, haloMat, ...gasMaterials];

  // Per-layer ortho factors mirror the perspective magic numbers so stars stay
  // smaller than gas/nebulae when switching to the orthographic camera.
  const orthoSizeable: OrthoLayer[] = [
    { material: fieldMat,      factor: 1.9 },
    { material: armGlowMat,    factor: 2.6 },
    { material: gasStreaksMat, factor: 2.6 },
    { material: nebulaeMat,    factor: 2.6 },
    { material: innerRingMat,  factor: 2.6 },
  ];
  if (centerDust) orthoSizeable.push({ material: centerDust.dustMaterial, factor: 2.6 });

  const clipMaterials: THREE.ShaderMaterial[] = [
    fieldMat, haloMat, armGlowMat, gasStreaksMat, nebulaeMat, innerRingMat,
  ];
  if (centerDust) clipMaterials.push(centerDust.discMaterial, centerDust.dustMaterial);

  const visibilityLayers: THREE.Points[] = [field, armGlow, gasStreaks, nebulae];

  function setDimming(factor: number): void {
    for (const m of dimMaterials) setUniform(m, 'uDim', factor);
  }

  function setGasDim(factor: number): void {
    for (const m of gasMaterials) setUniform(m, 'uDim', factor);
  }

  function setHaloVisible(visible: boolean): void {
    halo.visible = visible;
  }

  /** Drives point-sprite size for the orthographic camera. `zoom <= 0` falls back to perspective. */
  function setOrthoSize(zoom: number): void {
    if (zoom <= 0) {
      for (const { material } of orthoSizeable) setUniform(material, 'uOrthoSize', 0);
      return;
    }
    for (const { material, factor } of orthoSizeable) {
      setUniform(material, 'uOrthoSize', zoom * factor);
    }
  }

  /**
   * World-space clipping plane. Fragments where
   * `dot(normal, worldPos) + constant < 0` are discarded.
   * Pass `active === false` (and any normal/point) to disable.
   */
  function setClipping(active: boolean, normal?: THREE.Vector3, point?: THREE.Vector3): void {
    for (const mat of clipMaterials) {
      if (active && normal && point) {
        mat.uniforms.uClipActive.value = 1.0;
        mat.uniforms.uClipPlane.value.set(
          normal.x, normal.y, normal.z,
          -(normal.x * point.x + normal.y * point.y + normal.z * point.z),
        );
      } else {
        mat.uniforms.uClipActive.value = 0.0;
      }
    }
  }

  /** Drives per-particle visibility based on a multi-focal range field. */
  function setVisibilityField(config: VisibilityFieldConfig | null): void {
    const grid = galaxyData.grid;
    const projection = {
      cubeSize: grid.cubeSize,
      originX: grid.origin.x,
      originZ: grid.origin.z,
    };
    for (const layer of visibilityLayers) {
      const visAttr = layer.geometry.attributes.aVisibility as THREE.BufferAttribute | undefined;
      if (!visAttr) continue;
      if (!config) {
        (visAttr.array as Float32Array).fill(1);
      } else {
        const positions = layer.geometry.attributes.position.array as Float32Array;
        computeVisibilityField(
          positions,
          projection,
          config.focals,
          config.range,
          config.fadedOpacity ?? 0.2,
          visAttr.array as Float32Array,
        );
      }
      visAttr.needsUpdate = true;
    }
  }

  function dispose(): void {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else (mesh.material as THREE.Material).dispose();
      }
    });
  }

  return {
    object3D: root,
    setDimming,
    setGasDim,
    setHaloVisible,
    setOrthoSize,
    setClipping,
    setVisibilityField,
    dispose,
  };
}
