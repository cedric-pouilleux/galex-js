export type Vec3 = { x: number; y: number; z: number };
export type CubeCoord3 = { i: number; j: number; k: number };
export type Cube = CubeCoord3 & { starIndices: number[] };

export type CubeGridOptions = {
  cubeSize?: number;
  origin?: Vec3;
};

export type CubeGrid = {
  readonly cubeSize: number;
  readonly origin: Vec3;
  readonly cubes: Map<string, Cube>;
  worldToCube(x: number, y: number, z: number): CubeCoord3;
  cubeToWorldCenter(i: number, j: number, k: number): Vec3;
  index(positions: ArrayLike<number>): Map<string, Cube>;
  get(i: number, j: number, k: number): Cube | undefined;
  size(): number;
  remove(i: number, j: number, k: number): boolean;
  fillDisk(opts: { radius: number; j?: number }): void;
  occupiedCount(): number;
  bounds(): { minI: number; minJ: number; minK: number; maxI: number; maxJ: number; maxK: number };
  pickCube(origin: Vec3, direction: Vec3, opts?: { maxDistance?: number; maxSteps?: number }): Cube | null;
};

export function createCubeGrid({ cubeSize = 2, origin = { x: 0, y: 0, z: 0 } }: CubeGridOptions = {}): CubeGrid {
  const cubes = new Map<string, Cube>();
  const keyOf = (i: number, j: number, k: number) => `${i}|${j}|${k}`;

  function worldToCube(x: number, y: number, z: number): CubeCoord3 {
    return {
      i: Math.floor((x - origin.x) / cubeSize),
      j: Math.floor((y - origin.y) / cubeSize),
      k: Math.floor((z - origin.z) / cubeSize),
    };
  }

  function cubeToWorldCenter(i: number, j: number, k: number): Vec3 {
    return {
      x: origin.x + (i + 0.5) * cubeSize,
      y: origin.y + (j + 0.5) * cubeSize,
      z: origin.z + (k + 0.5) * cubeSize,
    };
  }

  function index(positions: ArrayLike<number>): Map<string, Cube> {
    cubes.clear();
    const n = positions.length / 3;
    for (let s = 0; s < n; s++) {
      const x = positions[s * 3];
      const y = positions[s * 3 + 1];
      const z = positions[s * 3 + 2];
      const { i, j, k } = worldToCube(x, y, z);
      const key = keyOf(i, j, k);
      let c = cubes.get(key);
      if (!c) {
        c = { i, j, k, starIndices: [] };
        cubes.set(key, c);
      }
      c.starIndices.push(s);
    }
    return cubes;
  }

  function get(i: number, j: number, k: number): Cube | undefined {
    return cubes.get(keyOf(i, j, k));
  }

  function size(): number {
    return cubes.size;
  }

  function remove(i: number, j: number, k: number): boolean {
    return cubes.delete(keyOf(i, j, k));
  }

  function fillDisk({ radius, j = 0 }: { radius: number; j?: number }): void {
    const iMin = Math.floor((-radius - origin.x) / cubeSize);
    const iMax = Math.floor(( radius - origin.x) / cubeSize);
    const kMin = Math.floor((-radius - origin.z) / cubeSize);
    const kMax = Math.floor(( radius - origin.z) / cubeSize);
    const r2 = radius * radius;

    for (let i = iMin; i <= iMax; i++) {
      for (let k = kMin; k <= kMax; k++) {
        const cx = origin.x + (i + 0.5) * cubeSize;
        const cz = origin.z + (k + 0.5) * cubeSize;
        if (cx * cx + cz * cz > r2) continue;
        const key = keyOf(i, j, k);
        if (!cubes.has(key)) {
          cubes.set(key, { i, j, k, starIndices: [] });
        }
      }
    }
  }

  function occupiedCount(): number {
    let n = 0;
    for (const c of cubes.values()) if (c.starIndices.length > 0) n++;
    return n;
  }

  function bounds() {
    let minI = Infinity, minJ = Infinity, minK = Infinity;
    let maxI = -Infinity, maxJ = -Infinity, maxK = -Infinity;
    for (const c of cubes.values()) {
      if (c.i < minI) minI = c.i; if (c.i > maxI) maxI = c.i;
      if (c.j < minJ) minJ = c.j; if (c.j > maxJ) maxJ = c.j;
      if (c.k < minK) minK = c.k; if (c.k > maxK) maxK = c.k;
    }
    return { minI, minJ, minK, maxI, maxJ, maxK };
  }

  // Amanatides & Woo voxel traversal: returns the first occupied cube the ray hits.
  function pickCube(rayOrigin: Vec3, direction: Vec3, { maxDistance = 800, maxSteps = 800 } = {}): Cube | null {
    const ox = rayOrigin.x - origin.x;
    const oy = rayOrigin.y - origin.y;
    const oz = rayOrigin.z - origin.z;

    let i = Math.floor(ox / cubeSize);
    let j = Math.floor(oy / cubeSize);
    let k = Math.floor(oz / cubeSize);

    const dx = direction.x, dy = direction.y, dz = direction.z;

    const stepI = dx > 0 ? 1 : dx < 0 ? -1 : 0;
    const stepJ = dy > 0 ? 1 : dy < 0 ? -1 : 0;
    const stepK = dz > 0 ? 1 : dz < 0 ? -1 : 0;

    const tDeltaX = stepI !== 0 ? Math.abs(cubeSize / dx) : Infinity;
    const tDeltaY = stepJ !== 0 ? Math.abs(cubeSize / dy) : Infinity;
    const tDeltaZ = stepK !== 0 ? Math.abs(cubeSize / dz) : Infinity;

    const firstBoundary = (o: number, d: number, idx: number, step: number) => {
      if (step === 0) return Infinity;
      const next = step > 0 ? (idx + 1) * cubeSize : idx * cubeSize;
      return (next - o) / d;
    };
    let tMaxX = firstBoundary(ox, dx, i, stepI);
    let tMaxY = firstBoundary(oy, dy, j, stepJ);
    let tMaxZ = firstBoundary(oz, dz, k, stepK);

    let t = 0;
    for (let n = 0; n < maxSteps; n++) {
      const cube = cubes.get(keyOf(i, j, k));
      if (cube) return cube;

      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        i += stepI; t = tMaxX; tMaxX += tDeltaX;
      } else if (tMaxY < tMaxZ) {
        j += stepJ; t = tMaxY; tMaxY += tDeltaY;
      } else {
        k += stepK; t = tMaxZ; tMaxZ += tDeltaZ;
      }
      if (t > maxDistance) return null;
    }
    return null;
  }

  return {
    cubeSize,
    origin,
    cubes,
    worldToCube,
    cubeToWorldCenter,
    index,
    get,
    size,
    remove,
    fillDisk,
    occupiedCount,
    bounds,
    pickCube,
  };
}
