import * as THREE from 'three';
import { computeVisibilityField } from '../core/Visibility.js';
import { composeGalaxyLayers } from './GalaxyLayersComposer.js';
import type {
  ComposeLayersOptions, ComposedGalaxyLayers, PointsLayer, StarLayer,
} from './GalaxyLayersComposer.js';
import { disposeObject3DTree } from './Dispose.js';
import type { GalaxyData } from '../core/GalaxyData.js';
import type { VisibilityFieldConfig } from '../core/Visibility.js';
import type { ShaderMaterialDef } from './effects/Shaders.js';

/** View-only options. Drive the visual layers without affecting `GalaxyData`. */
export type GalaxySceneOptions = ComposeLayersOptions;

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

/** Standard attribute set shared by every gas/arm Points layer (stretched sprite shader). */
function attachStretchedAttributes(
  geo: THREE.BufferGeometry,
  buffers: {
    positions: Float32Array; colors: Float32Array; sizes: Float32Array;
    tangents: Float32Array; stretches: Float32Array; visibility: Float32Array;
  },
): void {
  geo.setAttribute('position',    new THREE.BufferAttribute(buffers.positions, 3));
  geo.setAttribute('aColor',      new THREE.BufferAttribute(buffers.colors,    3));
  geo.setAttribute('aSize',       new THREE.BufferAttribute(buffers.sizes,     1));
  geo.setAttribute('aTangent',    new THREE.BufferAttribute(buffers.tangents,  2));
  geo.setAttribute('aStretch',    new THREE.BufferAttribute(buffers.stretches, 1));
  geo.setAttribute('aVisibility', new THREE.BufferAttribute(buffers.visibility, 1));
}

function makeStretchedPointsLayer<TBuffers extends {
  positions: Float32Array; colors: Float32Array; sizes: Float32Array;
  tangents: Float32Array; stretches: Float32Array; visibility: Float32Array;
}>(layer: PointsLayer<TBuffers>, name: string): THREE.Points {
  const geo = new THREE.BufferGeometry();
  attachStretchedAttributes(geo, layer.buffers);
  const points = new THREE.Points(geo, new THREE.ShaderMaterial(layer.materialDef));
  points.frustumCulled = false;
  points.name = name;
  return points;
}

function makeStarFieldPoints(layer: StarLayer): THREE.Points {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',    new THREE.BufferAttribute(layer.positions,  3));
  geo.setAttribute('aColor',      new THREE.BufferAttribute(layer.colors,     3));
  geo.setAttribute('aSize',       new THREE.BufferAttribute(layer.sizes,      1));
  geo.setAttribute('aVisibility', new THREE.BufferAttribute(layer.visibility, 1));
  const points = new THREE.Points(geo, new THREE.ShaderMaterial(layer.materialDef));
  points.frustumCulled = false;
  points.name = 'starField';
  return points;
}

function makeNebulaePoints(layer: PointsLayer<{
  positions: Float32Array; colors: Float32Array; sizes: Float32Array; visibility: Float32Array;
}>): THREE.Points {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',    new THREE.BufferAttribute(layer.buffers.positions,  3));
  geo.setAttribute('aColor',      new THREE.BufferAttribute(layer.buffers.colors,     3));
  geo.setAttribute('aSize',       new THREE.BufferAttribute(layer.buffers.sizes,      1));
  geo.setAttribute('aVisibility', new THREE.BufferAttribute(layer.buffers.visibility, 1));
  const points = new THREE.Points(geo, new THREE.ShaderMaterial(layer.materialDef));
  points.frustumCulled = false;
  points.name = 'nebulae';
  return points;
}

function makeHaloMesh(geometry: THREE.CircleGeometry, materialDef: ShaderMaterialDef): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial(materialDef));
  mesh.rotation.x = -Math.PI / 2;
  mesh.name = 'halo';
  return mesh;
}

function makeCenterDiscMesh(geometry: THREE.CircleGeometry, materialDef: ShaderMaterialDef): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, new THREE.ShaderMaterial(materialDef));
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

type AssembledLayers = {
  field: THREE.Points;
  halo: THREE.Mesh;
  armGlow: THREE.Points;
  gasStreaks: THREE.Points;
  nebulae: THREE.Points;
  innerRing: THREE.Points;
  centerDust: { group: THREE.Group; discMaterial: THREE.ShaderMaterial; dustMaterial: THREE.ShaderMaterial } | null;
};

function assemble(layers: ComposedGalaxyLayers): AssembledLayers {
  const field      = makeStarFieldPoints(layers.field);
  const halo       = makeHaloMesh(layers.halo.geometry, layers.halo.materialDef);
  const armGlow    = makeStretchedPointsLayer(layers.armGlow,    'armGlow');
  const gasStreaks = makeStretchedPointsLayer(layers.gasStreaks, 'gasStreaks');
  const nebulae    = makeNebulaePoints(layers.nebulae);
  const innerRing  = makeStretchedPointsLayer(layers.innerRing,  'innerRing');

  let centerDust: AssembledLayers['centerDust'] = null;
  if (layers.centerDust) {
    const group = new THREE.Group();
    group.name = 'centerDust';
    const disc = makeCenterDiscMesh(layers.centerDust.disc.geometry, layers.centerDust.disc.materialDef);
    group.add(disc);
    const dust = makeStretchedPointsLayer(layers.centerDust.dust, 'centerDustParticles');
    group.add(dust);
    centerDust = {
      group,
      discMaterial: disc.material as THREE.ShaderMaterial,
      dustMaterial: dust.material as THREE.ShaderMaterial,
    };
  }

  return { field, halo, armGlow, gasStreaks, nebulae, innerRing, centerDust };
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
  const layers = composeGalaxyLayers(galaxyData, viewOpts);
  const a = assemble(layers);

  const root = new THREE.Group();
  root.add(a.field);
  root.add(a.halo);
  root.add(a.armGlow);
  root.add(a.gasStreaks);
  root.add(a.nebulae);
  root.add(a.innerRing);
  if (a.centerDust) root.add(a.centerDust.group);

  // Cast each material once — the per-setter fan-out below stays cast-free.
  const fieldMat      = a.field.material      as THREE.ShaderMaterial;
  const haloMat       = a.halo.material       as THREE.ShaderMaterial;
  const armGlowMat    = a.armGlow.material    as THREE.ShaderMaterial;
  const gasStreaksMat = a.gasStreaks.material as THREE.ShaderMaterial;
  const nebulaeMat    = a.nebulae.material    as THREE.ShaderMaterial;
  const innerRingMat  = a.innerRing.material  as THREE.ShaderMaterial;

  // Concern groups: one list per setter. setDimming = field + halo + gas.
  const gasMaterials: THREE.ShaderMaterial[] = [armGlowMat, gasStreaksMat, nebulaeMat, innerRingMat];
  if (a.centerDust) gasMaterials.push(a.centerDust.discMaterial, a.centerDust.dustMaterial);
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
  if (a.centerDust) orthoSizeable.push({ material: a.centerDust.dustMaterial, factor: 2.6 });

  const clipMaterials: THREE.ShaderMaterial[] = [
    fieldMat, haloMat, armGlowMat, gasStreaksMat, nebulaeMat, innerRingMat,
  ];
  if (a.centerDust) clipMaterials.push(a.centerDust.discMaterial, a.centerDust.dustMaterial);

  const visibilityLayers: THREE.Points[] = [a.field, a.armGlow, a.gasStreaks, a.nebulae];

  function setDimming(factor: number): void {
    for (const m of dimMaterials) setUniform(m, 'uDim', factor);
  }

  function setGasDim(factor: number): void {
    for (const m of gasMaterials) setUniform(m, 'uDim', factor);
  }

  function setHaloVisible(visible: boolean): void {
    a.halo.visible = visible;
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
    disposeObject3DTree(root);
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
