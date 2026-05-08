import * as THREE from 'three';
import { mulberry32, deriveSubseed } from '../../core/Random.js';
import { nameStarInCube } from '../StarNames.js';
import { getDevicePixelRatio } from '../effects/Shaders.js';
import type { GalaxyData } from '../../core/GalaxyData.js';
import type { Cube } from '../../core/CubeGrid.js';
import { STAR_VERT, STAR_FRAG } from './StarShader.js';

/**
 * Optional highlight applied to one star inside the inspected cube. `index` is
 * the global star index (matches `Galaxy.data` ordering); when the cube does
 * not contain that index, no highlight is rendered.
 */
export type CloseupHighlight = {
  index: number;
  color?: [number, number, number];
  sizeMultiplier?: number;
  label?: string;
};

export type CloseupField = {
  /** Renderable points (buffers + shader material) ready to add to the scene. */
  points: THREE.Points;
  /** Per-particle name (Bayer-style) for hover tooltips. */
  names: string[];
  /** Per-particle temperature in K (matches the cube's source `data.temps`). */
  temps: Float32Array;
};

/**
 * Builds the close-up THREE.Points for a cube — a sub-buffer of the cube's
 * stars with an optional highlight tint applied to one of them. Returns
 * `null` when the cube has zero stars (the close-up still renders the
 * wireframe in that case).
 */
export function prepareCloseupField(
  cube: Cube,
  galaxyData: GalaxyData,
  highlight: CloseupHighlight | null = null,
): CloseupField | null {
  const N = cube.starIndices.length;
  if (N === 0) return null;

  const src = galaxyData.data;
  const positions = new Float32Array(N * 3);
  const colors    = new Float32Array(N * 3);
  const sizes     = new Float32Array(N);
  const temps     = new Float32Array(N);
  const names     = new Array<string>(N);

  const highlightSizeMul = highlight?.sizeMultiplier ?? 2.4;

  for (let n = 0; n < N; n++) {
    const idx = cube.starIndices[n];
    positions[n * 3 + 0] = src.positions[idx * 3 + 0];
    positions[n * 3 + 1] = src.positions[idx * 3 + 1];
    positions[n * 3 + 2] = src.positions[idx * 3 + 2];
    temps[n] = src.temps ? src.temps[idx] : 0;

    const isHighlighted = highlight && idx === highlight.index;
    if (isHighlighted) {
      const c = highlight.color ?? [
        src.colors[idx * 3 + 0],
        src.colors[idx * 3 + 1],
        src.colors[idx * 3 + 2],
      ];
      colors[n * 3 + 0] = c[0];
      colors[n * 3 + 1] = c[1];
      colors[n * 3 + 2] = c[2];
      sizes[n] = src.sizes[idx] * highlightSizeMul;
      names[n] = highlight.label ?? nameStarInCube(cube, n);
    } else {
      colors[n * 3 + 0] = src.colors[idx * 3 + 0];
      colors[n * 3 + 1] = src.colors[idx * 3 + 1];
      colors[n * 3 + 2] = src.colors[idx * 3 + 2];
      sizes[n] = src.sizes[idx] * 1.5;
      names[n] = nameStarInCube(cube, n);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor',   new THREE.BufferAttribute(colors, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes, 1));
  geo.setAttribute('aTemp',    new THREE.BufferAttribute(temps, 1));

  // Per-star seeds derived from the galaxy seed + cube coords. Same cube
  // re-opened ⇒ same trait distribution, so star appearance is stable.
  const cubeRng = mulberry32(deriveSubseed(galaxyData.seed, `closeup-${cube.i}-${cube.j}-${cube.k}`));
  const seeds = new Float32Array(N);
  for (let n = 0; n < N; n++) seeds[n] = cubeRng();
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));

  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uPixelRatio: { value: getDevicePixelRatio() },
      uTime:       { value: 0 },
    },
    vertexShader: STAR_VERT,
    fragmentShader: STAR_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;

  return { points, names, temps };
}
