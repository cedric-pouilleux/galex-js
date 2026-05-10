import * as THREE from 'three';
import { mulberry32, deriveSubseed } from '../../core/Random.js';
import { nameStarInCube } from '../StarNames.js';
import { getDevicePixelRatio } from '../effects/Shaders.js';
import type { GalaxyData } from '../../core/GalaxyData.js';
import type { Cube } from '../../core/CubeGrid.js';
import { STAR_VERT, STAR_FRAG } from './StarShader.js';

const DEFAULT_HIGHLIGHT_SIZE_MUL = 2.4;
const REGULAR_STAR_SIZE_MUL = 1.5;

/**
 * Optional highlight applied to one star inside the inspected selection.
 * `index` is the global star index (matches `Galaxy.data` ordering); when the
 * selection does not contain that index, no highlight is rendered.
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
  /** Per-particle temperature in K (matches the cubes' source `data.temps`). */
  temps: Float32Array;
  /**
   * Per-particle global star index (matches `galaxyData.data` ordering).
   * Used to translate a local raycast hit back into the source buffer —
   * the only safe local→global mapping when several cubes are merged.
   */
  globalIndices: Int32Array;
};

type CloseupBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  temps: Float32Array;
  seeds: Float32Array;
  globalIndices: Int32Array;
  names: string[];
};

/**
 * Builds the close-up THREE.Points for one or more cubes — a sub-buffer of the
 * source stars with an optional highlight tint applied to one of them. With a
 * single cube the behaviour is unchanged; with several cubes their star
 * buffers are concatenated into one renderable field, suitable for a marquee
 * / paint-style multi-cube inspection.
 *
 * Returns `null` when the selection holds zero stars (the close-up still
 * renders the wireframe in that case).
 */
export function prepareCloseupField(
  cubes: Cube | readonly Cube[],
  galaxyData: GalaxyData,
  highlight: CloseupHighlight | null = null,
): CloseupField | null {
  const cubeList = Array.isArray(cubes) ? cubes : [cubes as Cube];
  const total = countStars(cubeList);
  if (total === 0) return null;

  const buffers = allocateBuffers(total);
  fillBuffers(buffers, cubeList, galaxyData, highlight);
  return buildPoints(buffers);
}

// ─── Pipeline steps ──────────────────────────────────────────────────────────

function countStars(cubeList: readonly Cube[]): number {
  let total = 0;
  for (const c of cubeList) total += c.starIndices.length;
  return total;
}

function allocateBuffers(total: number): CloseupBuffers {
  return {
    positions:     new Float32Array(total * 3),
    colors:        new Float32Array(total * 3),
    sizes:         new Float32Array(total),
    temps:         new Float32Array(total),
    seeds:         new Float32Array(total),
    globalIndices: new Int32Array(total),
    names:         new Array<string>(total),
  };
}

/**
 * Writes one star per slot, walking each cube and pulling from the source
 * `galaxyData.data` buffers. The per-cube seed (derived from the galaxy seed
 * and cube coordinates) makes the star traits stable across re-opens.
 */
function fillBuffers(
  buf: CloseupBuffers,
  cubeList: readonly Cube[],
  galaxyData: GalaxyData,
  highlight: CloseupHighlight | null,
): void {
  const src = galaxyData.data;
  const highlightSize = highlight?.sizeMultiplier ?? DEFAULT_HIGHLIGHT_SIZE_MUL;

  let n = 0;
  for (const cube of cubeList) {
    const cubeRng = mulberry32(deriveSubseed(galaxyData.seed, `closeup-${cube.i}-${cube.j}-${cube.k}`));
    for (let m = 0; m < cube.starIndices.length; m++, n++) {
      const globalIdx = cube.starIndices[m];
      buf.globalIndices[n] = globalIdx;
      buf.seeds[n] = cubeRng();
      buf.temps[n] = src.temps ? src.temps[globalIdx] : 0;
      writeVec3(buf.positions, n, src.positions, globalIdx);

      const isHighlighted = highlight !== null && globalIdx === highlight.index;
      if (isHighlighted) {
        writeRgbOverride(buf.colors, n, highlight.color, src.colors, globalIdx);
        buf.sizes[n] = src.sizes[globalIdx] * highlightSize;
        buf.names[n] = highlight.label ?? nameStarInCube(cube, m);
      } else {
        writeVec3(buf.colors, n, src.colors, globalIdx);
        buf.sizes[n] = src.sizes[globalIdx] * REGULAR_STAR_SIZE_MUL;
        buf.names[n] = nameStarInCube(cube, m);
      }
    }
  }
}

function buildPoints(buf: CloseupBuffers): CloseupField {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(buf.positions, 3));
  geo.setAttribute('aColor',   new THREE.BufferAttribute(buf.colors, 3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(buf.sizes, 1));
  geo.setAttribute('aTemp',    new THREE.BufferAttribute(buf.temps, 1));
  geo.setAttribute('aSeed',    new THREE.BufferAttribute(buf.seeds, 1));

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

  return { points, names: buf.names, temps: buf.temps, globalIndices: buf.globalIndices };
}

// ─── Buffer write helpers ────────────────────────────────────────────────────

function writeVec3(dst: Float32Array, slot: number, src: ArrayLike<number>, srcIdx: number): void {
  dst[slot * 3 + 0] = src[srcIdx * 3 + 0];
  dst[slot * 3 + 1] = src[srcIdx * 3 + 1];
  dst[slot * 3 + 2] = src[srcIdx * 3 + 2];
}

function writeRgbOverride(
  dst: Float32Array,
  slot: number,
  override: [number, number, number] | undefined,
  fallback: ArrayLike<number>,
  fallbackIdx: number,
): void {
  if (override) {
    dst[slot * 3 + 0] = override[0];
    dst[slot * 3 + 1] = override[1];
    dst[slot * 3 + 2] = override[2];
  } else {
    writeVec3(dst, slot, fallback, fallbackIdx);
  }
}
