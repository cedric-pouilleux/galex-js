import * as THREE from 'three';
import { computeVisibilityField } from '../core/Visibility.js';
import { composeGalaxyLayers } from './GalaxyLayersComposer.js';
import type {
  ComposeLayersOptions, ComposedGalaxyLayers, PointsLayer, StarLayer,
  VisibilityAwareLayerName,
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
  /** Toggles the galactic core (inner ring + center dust). Typically hidden under fog of war. */
  setCoreVisible(visible: boolean): void;
  setOrthoSize(zoom: number): void;
  setClipping(active: boolean, normal?: THREE.Vector3, point?: THREE.Vector3): void;
  setVisibilityField(config: VisibilityFieldConfig | null): void;
  dispose(): void;
};

type OrthoLayer = { material: THREE.ShaderMaterial; factor: number };

/** Geometry + material pair for any single-mesh/points layer. */
type LayerHandle<TObject extends THREE.Object3D> = {
  object: TObject;
  material: THREE.ShaderMaterial;
};

type CenterDustHandle = {
  group: THREE.Group;
  disc: LayerHandle<THREE.Mesh>;
  dust: LayerHandle<THREE.Points>;
};

type AssembledLayers = {
  field: LayerHandle<THREE.Points>;
  halo: LayerHandle<THREE.Mesh>;
  armGlow: LayerHandle<THREE.Points>;
  gasStreaks: LayerHandle<THREE.Points>;
  nebulae: LayerHandle<THREE.Points>;
  innerRing: LayerHandle<THREE.Points>;
  centerDust: CenterDustHandle | null;
};

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
}>(layer: PointsLayer<TBuffers>, name: string): LayerHandle<THREE.Points> {
  const geo = new THREE.BufferGeometry();
  attachStretchedAttributes(geo, layer.buffers);
  const material = new THREE.ShaderMaterial(layer.materialDef);
  const object = new THREE.Points(geo, material);
  object.frustumCulled = false;
  object.name = name;
  return { object, material };
}

function makeStarFieldPoints(layer: StarLayer): LayerHandle<THREE.Points> {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',    new THREE.BufferAttribute(layer.positions,  3));
  geo.setAttribute('aColor',      new THREE.BufferAttribute(layer.colors,     3));
  geo.setAttribute('aSize',       new THREE.BufferAttribute(layer.sizes,      1));
  geo.setAttribute('aVisibility', new THREE.BufferAttribute(layer.visibility, 1));
  const material = new THREE.ShaderMaterial(layer.materialDef);
  const object = new THREE.Points(geo, material);
  object.frustumCulled = false;
  object.name = 'field';
  return { object, material };
}

function makeNebulaePoints(layer: PointsLayer<{
  positions: Float32Array; colors: Float32Array; sizes: Float32Array; visibility: Float32Array;
}>): LayerHandle<THREE.Points> {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',    new THREE.BufferAttribute(layer.buffers.positions,  3));
  geo.setAttribute('aColor',      new THREE.BufferAttribute(layer.buffers.colors,     3));
  geo.setAttribute('aSize',       new THREE.BufferAttribute(layer.buffers.sizes,      1));
  geo.setAttribute('aVisibility', new THREE.BufferAttribute(layer.buffers.visibility, 1));
  const material = new THREE.ShaderMaterial(layer.materialDef);
  const object = new THREE.Points(geo, material);
  object.frustumCulled = false;
  object.name = 'nebulae';
  return { object, material };
}

function makeFlatDiscMesh(
  geometry: THREE.CircleGeometry,
  materialDef: ShaderMaterialDef,
  name: string,
): LayerHandle<THREE.Mesh> {
  const material = new THREE.ShaderMaterial(materialDef);
  const object = new THREE.Mesh(geometry, material);
  object.rotation.x = -Math.PI / 2;
  object.name = name;
  return { object, material };
}

function assemble(layers: ComposedGalaxyLayers): AssembledLayers {
  const field      = makeStarFieldPoints(layers.field);
  const halo       = makeFlatDiscMesh(layers.halo.geometry, layers.halo.materialDef, 'halo');
  const armGlow    = makeStretchedPointsLayer(layers.armGlow,    'armGlow');
  const gasStreaks = makeStretchedPointsLayer(layers.gasStreaks, 'gasStreaks');
  const nebulae    = makeNebulaePoints(layers.nebulae);
  const innerRing  = makeStretchedPointsLayer(layers.innerRing,  'innerRing');

  let centerDust: CenterDustHandle | null = null;
  if (layers.centerDust) {
    const group = new THREE.Group();
    group.name = 'centerDust';
    const disc = makeFlatDiscMesh(
      layers.centerDust.disc.geometry,
      layers.centerDust.disc.materialDef,
      'centerDisc',
    );
    group.add(disc.object);
    const dust = makeStretchedPointsLayer(layers.centerDust.dust, 'centerDustParticles');
    group.add(dust.object);
    centerDust = { group, disc, dust };
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
  root.add(a.field.object);
  root.add(a.halo.object);
  root.add(a.armGlow.object);
  root.add(a.gasStreaks.object);
  root.add(a.nebulae.object);
  root.add(a.innerRing.object);
  if (a.centerDust) root.add(a.centerDust.group);

  // Concern groups: one list per setter. setDimming = field + halo + gas.
  const gasMaterials: THREE.ShaderMaterial[] = [
    a.armGlow.material, a.gasStreaks.material, a.nebulae.material, a.innerRing.material,
  ];
  if (a.centerDust) gasMaterials.push(a.centerDust.disc.material, a.centerDust.dust.material);
  const dimMaterials: THREE.ShaderMaterial[] = [a.field.material, a.halo.material, ...gasMaterials];

  // Per-layer ortho factors mirror the perspective magic numbers so stars stay
  // smaller than gas/nebulae when switching to the orthographic camera.
  const orthoSizeable: OrthoLayer[] = [
    { material: a.field.material,      factor: 1.9 },
    { material: a.armGlow.material,    factor: 2.6 },
    { material: a.gasStreaks.material, factor: 2.6 },
    { material: a.nebulae.material,    factor: 2.6 },
    { material: a.innerRing.material,  factor: 2.6 },
  ];
  if (a.centerDust) orthoSizeable.push({ material: a.centerDust.dust.material, factor: 2.6 });

  const clipMaterials: THREE.ShaderMaterial[] = [
    a.field.material, a.halo.material,
    a.armGlow.material, a.gasStreaks.material, a.nebulae.material, a.innerRing.material,
  ];
  if (a.centerDust) clipMaterials.push(a.centerDust.disc.material, a.centerDust.dust.material);

  // Resolved by name from the composer's `visibilityAwareLayers` list — keeps
  // the orchestrator out of the "which layer is masked" decision.
  const visibilityHandlesByName: Record<VisibilityAwareLayerName, LayerHandle<THREE.Points>> = {
    field: a.field,
    armGlow: a.armGlow,
    gasStreaks: a.gasStreaks,
    nebulae: a.nebulae,
  };
  const visibilityLayers: LayerHandle<THREE.Points>[] =
    layers.visibilityAwareLayers.map((name) => visibilityHandlesByName[name]);

  function setDimming(factor: number): void {
    for (const m of dimMaterials) setUniform(m, 'uDim', factor);
  }

  function setGasDim(factor: number): void {
    for (const m of gasMaterials) setUniform(m, 'uDim', factor);
  }

  function setHaloVisible(visible: boolean): void {
    a.halo.object.visible = visible;
  }

  function setCoreVisible(visible: boolean): void {
    a.innerRing.object.visible = visible;
    if (a.centerDust) a.centerDust.group.visible = visible;
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
    for (const handle of visibilityLayers) {
      const visAttr = handle.object.geometry.attributes.aVisibility;
      if (!(visAttr instanceof THREE.BufferAttribute)) continue;
      const visArray = visAttr.array as Float32Array;
      if (!config) {
        visArray.fill(1);
      } else {
        const posAttr = handle.object.geometry.attributes.position;
        const positions = posAttr.array as Float32Array;
        computeVisibilityField(
          positions,
          projection,
          config.focals,
          config.range,
          config.fadedOpacity ?? 0.2,
          visArray,
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
    setCoreVisible,
    setOrthoSize,
    setClipping,
    setVisibilityField,
    dispose,
  };
}
