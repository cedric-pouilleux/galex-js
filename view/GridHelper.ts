import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { tierMapForVisibilityField } from '../core/Visibility.js';
import type { CubeCoord } from '../core/Visibility.js';
import type { CubeGrid } from '../core/CubeGrid.js';

// Every LineMaterial created here is tracked; the host calls
// setThickLineResolution() on resize so the pixel-space line width stays correct.
const thickLineMaterials = new Set<LineMaterial>();

export function setThickLineResolution(width: number, height: number): void {
  for (const mat of thickLineMaterials) mat.resolution.set(width, height);
}

/** Initial line resolution — host should call setThickLineResolution() on first frame and on resize. */
function initialLineResolution(): THREE.Vector2 {
  if (typeof window !== 'undefined') {
    return new THREE.Vector2(window.innerWidth, window.innerHeight);
  }
  return new THREE.Vector2(1, 1);
}

// Indices of the 12 edges of an axis-aligned box, referencing the 8 corners
// in their canonical order (-x-y-z, +x-y-z, +x+y-z, -x+y-z, -x-y+z, +x-y+z, +x+y+z, -x+y+z).
const BOX_EDGE_INDICES: readonly [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

function boxCornersAround(cx: number, cy: number, cz: number, halfSize: number): [number, number, number][] {
  const x0 = cx - halfSize, y0 = cy - halfSize, z0 = cz - halfSize;
  const x1 = cx + halfSize, y1 = cy + halfSize, z1 = cz + halfSize;
  return [
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
  ];
}

function pushBoxEdges(out: number[], corners: [number, number, number][]): void {
  for (const [a, b] of BOX_EDGE_INDICES) out.push(...corners[a], ...corners[b]);
}

function makeBoxEdgePositions(cubeSize: number): number[] {
  const out: number[] = [];
  pushBoxEdges(out, boxCornersAround(0, 0, 0, cubeSize / 2));
  return out;
}

export function createCubeWireframe(
  cubeSize: number,
  color = 0x6cf2ff,
  opts: { linewidth?: number; opacity?: number } = {},
): LineSegments2 {
  const { linewidth = 2.5, opacity = 1.0 } = opts;
  const geo = new LineSegmentsGeometry();
  geo.setPositions(makeBoxEdgePositions(cubeSize));
  const mat = new LineMaterial({
    color,
    linewidth,
    transparent: opacity < 1.0,
    opacity,
    depthTest: false,
    resolution: initialLineResolution(),
  });
  thickLineMaterials.add(mat);
  const origDispose = mat.dispose.bind(mat);
  mat.dispose = () => { thickLineMaterials.delete(mat); origDispose(); };
  const wire = new LineSegments2(geo, mat);
  wire.computeLineDistances();
  wire.renderOrder = 999;
  return wire;
}

export function createOccupiedGridLines(grid: CubeGrid, color = 0x223044): THREE.LineSegments {
  const positions: number[] = [];
  const halfSize = grid.cubeSize / 2;
  for (const cube of grid.cubes.values()) {
    const c = grid.cubeToWorldCenter(cube.i, cube.j, cube.k);
    pushBoxEdges(positions, boxCornersAround(c.x, c.y, c.z, halfSize));
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  const mat = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  });
  return new THREE.LineSegments(geo, mat);
}

/**
 * 2-tier wireframe over the cubes covered by a visibility field. Inner cubes
 * (Chebyshev d ≤ range-1 from any focal) get full opacity, rim cubes get the
 * faded one. Returns a Group containing one LineSegments per tier.
 */
export function createVisibilityFieldLines(
  grid: CubeGrid,
  focals: CubeCoord[],
  {
    range = 2,
    color = 0x223044,
    fullOpacity = 0.22,
    fadedOpacity = 0.045,
  }: { range?: number; color?: number; fullOpacity?: number; fadedOpacity?: number } = {},
): THREE.Group {
  const halfSize = grid.cubeSize / 2;
  const tiers: number[][] = [[], []];

  const cubeExists = (i: number, j: number, k: number) => Boolean(grid.get(i, j, k));
  const tierByCube = tierMapForVisibilityField(focals, range, cubeExists);

  for (const [key, tier] of tierByCube) {
    const [iStr, jStr, kStr] = key.split('|');
    const i = Number(iStr), j = Number(jStr), k = Number(kStr);
    const c = grid.cubeToWorldCenter(i, j, k);
    pushBoxEdges(tiers[tier], boxCornersAround(c.x, c.y, c.z, halfSize));
  }

  const group = new THREE.Group();
  group.name = 'visibilityFieldLines';
  for (let t = 0; t < 2; t++) {
    if (tiers[t].length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(tiers[t], 3));
    const mat = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: t === 0 ? fullOpacity : fadedOpacity,
      depthWrite: false,
    });
    group.add(new THREE.LineSegments(geo, mat));
  }
  return group;
}
