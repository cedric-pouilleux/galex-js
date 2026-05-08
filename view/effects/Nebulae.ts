import * as THREE from 'three';
import { resolveArmCadence } from './ArmCadence.js';
import type { ArmLayerOptions } from './ArmCadence.js';
import { NEBULA_PALETTE, NEBULA_VERT, NEBULA_FRAG, createPointsMaterialDef } from './Shaders.js';
import type { ShaderMaterialDef } from './Shaders.js';

export type NebulaeOptions = ArmLayerOptions & {
  clusters?: number;
  blobsPerCluster?: number;
};

/** Pure-data buffers for the nebulae layer. No Three, no DOM — runtime-agnostic. */
export type NebulaeBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  visibility: Float32Array;
  count: number;
};

/**
 * Computes the per-particle buffers for the nebulae layer. Each cluster picks
 * a random arm + radius then scatters its blobs along the arm tangent rather
 * than across, so the result reads as elongated patches instead of round
 * clouds. Runtime-agnostic — usable from Node, the browser, or a Vue/TresJS
 * template's `<TresBufferGeometry>`.
 */
export function buildNebulaeBuffers({
  radius,
  innerRadius = 5,
  arms = 4,
  spin = 0.9,
  armSpinJ = null,
  armPhaseJ = null,
  clusters = 32,
  blobsPerCluster = 5,
  rng = Math.random,
}: NebulaeOptions): NebulaeBuffers {
  const N = clusters * blobsPerCluster;
  const positions = new Float32Array(N * 3);
  const colors    = new Float32Array(N * 3);
  const sizes     = new Float32Array(N);

  const { spinJ, phaseJ } = resolveArmCadence(arms, rng, armSpinJ, armPhaseJ);

  let n = 0;
  for (let c = 0; c < clusters; c++) {
    const arm = Math.floor(rng() * arms);
    const armAngle = (arm / arms) * Math.PI * 2 + phaseJ[arm];
    const r = innerRadius + 8 + rng() * (radius * 0.72 - innerRadius - 8);
    const spiral = (r / radius) * Math.PI * 2 * spin * spinJ[arm];
    // Tight noise so the cluster sits very close to the arm centerline.
    const noise = (rng() - 0.5) * 0.14;
    const theta = armAngle + spiral + noise;
    const cx = r * Math.cos(theta);
    const cz = r * Math.sin(theta);

    // Local arm tangent — used to scatter blobs ALONG the arm rather than across.
    const tangent = { x: -Math.sin(theta), z: Math.cos(theta) };
    const normal  = { x:  Math.cos(theta), z: Math.sin(theta) };

    const baseColor = NEBULA_PALETTE[Math.floor(rng() * NEBULA_PALETTE.length)];
    const clusterScale = 0.7 + rng() * 0.7;

    for (let b = 0; b < blobsPerCluster; b++) {
      const along = (rng() - 0.5) * 5.0 * clusterScale;
      const across = (rng() - 0.5) * 1.6 * clusterScale;
      const dx = tangent.x * along + normal.x * across;
      const dz = tangent.z * along + normal.z * across;
      const dy = (rng() - 0.5) * 1.0;

      positions[n * 3 + 0] = cx + dx;
      positions[n * 3 + 1] = dy;
      positions[n * 3 + 2] = cz + dz;

      const v = 0.7 + rng() * 0.5;
      colors[n * 3 + 0] = baseColor[0] * v;
      colors[n * 3 + 1] = baseColor[1] * v;
      colors[n * 3 + 2] = baseColor[2] * v;

      sizes[n] = (3.5 + rng() * 7) * clusterScale;
      n++;
    }
  }

  const visibility = new Float32Array(N);
  visibility.fill(1);

  return { positions, colors, sizes, visibility, count: N };
}

/** Material def for the nebulae layer — reusable by both Three impératif and TresJS. */
export function createNebulaeMaterialDef(): ShaderMaterialDef {
  return createPointsMaterialDef(NEBULA_VERT, NEBULA_FRAG);
}

/**
 * Builds a `THREE.Points` cluster of HII / reflection / planetary nebulae
 * sprites laid out along the spiral arms — convenience for the impératif
 * Three.js path. TresJS callers consume `buildNebulaeBuffers` and
 * `createNebulaeMaterialDef` directly.
 */
export function createNebulae(opts: NebulaeOptions): THREE.Points {
  const buffers = buildNebulaeBuffers(opts);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',    new THREE.BufferAttribute(buffers.positions, 3));
  geo.setAttribute('aColor',      new THREE.BufferAttribute(buffers.colors,    3));
  geo.setAttribute('aSize',       new THREE.BufferAttribute(buffers.sizes,     1));
  geo.setAttribute('aVisibility', new THREE.BufferAttribute(buffers.visibility, 1));

  const points = new THREE.Points(geo, new THREE.ShaderMaterial(createNebulaeMaterialDef()));
  points.frustumCulled = false;
  points.name = 'nebulae';
  return points;
}
