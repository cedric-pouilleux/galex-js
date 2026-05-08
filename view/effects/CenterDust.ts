import * as THREE from 'three';
import { resolveArmCadence } from './ArmCadence.js';
import type { ArmLayerOptions } from './ArmCadence.js';
import {
  HALO_VERT, CENTER_DISC_FRAG, STRETCH_VERT, STRETCH_FRAG, createPointsMaterialDef,
} from './Shaders.js';
import type { ShaderMaterialDef } from './Shaders.js';

export type CenterDustOptions = ArmLayerOptions & {
  color?: number;
  intensity?: number;
  dustParticles?: number;
};

/** Pure-data buffers for the spiraled dust cloud (the disc has its own geometry). */
export type CenterDustBuffers = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  tangents: Float32Array;
  stretches: Float32Array;
  visibility: Float32Array;
  count: number;
};

export type CenterDust = {
  readonly object3D: THREE.Group;
  readonly discMaterial: THREE.ShaderMaterial;
  readonly dustMaterial: THREE.ShaderMaterial;
};

/**
 * Computes the spiraled dust cloud buffers — each particle follows a randomly
 * picked arm's spiral angle with a wide angular noise so it stays diffuse.
 * Extended to 3.5× innerRadius to dilute naturally into the base of the arms.
 */
export function buildCenterDustBuffers({
  innerRadius = 5,
  radius = 50,
  arms = 6,
  spin = 0.9,
  armSpinJ = null,
  armPhaseJ = null,
  color = 0xffc580,
  dustParticles = 1400,
  rng = Math.random,
}: CenterDustOptions): CenterDustBuffers {
  const { spinJ, phaseJ } = resolveArmCadence(arms, rng, armSpinJ, armPhaseJ);

  const N = dustParticles;
  const rMax = innerRadius * 3.5;
  const positions = new Float32Array(N * 3);
  const colors    = new Float32Array(N * 3);
  const sizes     = new Float32Array(N);
  const tangents  = new Float32Array(N * 2);
  const stretches = new Float32Array(N);
  const baseColor = new THREE.Color(color);

  for (let n = 0; n < N; n++) {
    // Radial distribution concentrated at the centre but stretching to rMax.
    const t = Math.pow(rng(), 1.4);
    const r = rMax * t + 0.05;
    // Spiral pattern from a randomly picked arm, with a wider angular noise
    // toward the centre (orbits aren't tightly bound to arms there).
    const arm = Math.floor(rng() * arms);
    const armAngle = (arm / arms) * Math.PI * 2 + phaseJ[arm];
    const spiral = (r / radius) * Math.PI * 2 * spin * spinJ[arm];
    const widthCenter = 1.4 - 0.9 * t; // 1.4 rad near centre → 0.5 rad at the rim
    const noise = (rng() - 0.5) * 2 * widthCenter;
    const theta = armAngle + spiral + noise;

    positions[n * 3 + 0] = r * Math.cos(theta);
    positions[n * 3 + 1] = (rng() - 0.5) * 0.5;
    positions[n * 3 + 2] = r * Math.sin(theta);

    // Spiral tangent for stretched particles.
    const dThetaDr = (Math.PI * 2 * spin * spinJ[arm]) / radius;
    const dposX = Math.cos(theta) - r * Math.sin(theta) * dThetaDr;
    const dposZ = Math.sin(theta) + r * Math.cos(theta) * dThetaDr;
    const dposLen = Math.hypot(dposX, dposZ) || 1;
    tangents[n * 2 + 0] = dposX / dposLen;
    tangents[n * 2 + 1] = dposZ / dposLen;
    // The further out, the more likely we get stretched trails (smooth
    // transition into the gas-streak wisps).
    stretches[n] = rng() < 0.25 + 0.4 * t ? 0.5 + rng() * 0.4 : 0;

    // Subtle hue shift: yellow-white near the centre, more orange at the rim.
    // Alpha fades outward (via colour scaling — additive blending) so peripheral
    // particles dissolve into the arms without a hard edge.
    const warmShift = 0.7 - 0.4 * t;
    const fade = 1.0 - 0.55 * t;
    const v = (0.55 + rng() * 0.5) * fade;
    colors[n * 3 + 0] = baseColor.r * v;
    colors[n * 3 + 1] = baseColor.g * v * (0.85 + 0.15 * (1 - warmShift));
    colors[n * 3 + 2] = baseColor.b * v * (0.65 + 0.25 * (1 - warmShift));

    sizes[n] = 2.0 + rng() * 5.0 * (1 - 0.5 * t);
  }

  const visibility = new Float32Array(N);
  visibility.fill(1);

  return { positions, colors, sizes, tangents, stretches, visibility, count: N };
}

/** Geometry for the warm bulge disc (flat circle stretched 3.5× the innerRadius). */
export function createCenterDiscGeometry(innerRadius: number): THREE.CircleGeometry {
  return new THREE.CircleGeometry(innerRadius * 3.5, 96);
}

/** Material def for the warm bulge disc. */
export function createCenterDiscMaterialDef({
  color = 0xffc580,
  intensity = 0.55,
}: { color?: number; intensity?: number } = {}): ShaderMaterialDef {
  return {
    vertexShader: HALO_VERT,
    fragmentShader: CENTER_DISC_FRAG,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uIntensity: { value: intensity },
      uDim: { value: 1.0 },
      uClipPlane: { value: new THREE.Vector4(0, 0, 1, 0) },
      uClipActive: { value: 0.0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  };
}

/** Material def for the spiraled dust particles (stretched sprite shader). */
export function createCenterDustMaterialDef(): ShaderMaterialDef {
  return createPointsMaterialDef(STRETCH_VERT, STRETCH_FRAG);
}

/**
 * Builds the central bulge as a `THREE.Group` containing a warm disc + a
 * spiraled dust cloud. TresJS callers compose with `createCenterDiscGeometry` +
 * `createCenterDiscMaterialDef` for the disc and `buildCenterDustBuffers` +
 * `createCenterDustMaterialDef` for the dust.
 */
export function createCenterDust(opts: CenterDustOptions): CenterDust {
  const { innerRadius = 5, color = 0xffc580, intensity = 0.55 } = opts;
  const buffers = buildCenterDustBuffers(opts);

  const object3D = new THREE.Group();
  object3D.name = 'centerDust';

  // 1) Wide warm disc that fades far inside its polygon edge so its halo
  //    blends into the inner ring and the arms.
  const discMaterial = new THREE.ShaderMaterial(createCenterDiscMaterialDef({ color, intensity }));
  const disc = new THREE.Mesh(createCenterDiscGeometry(innerRadius), discMaterial);
  disc.rotation.x = -Math.PI / 2;
  object3D.add(disc);

  // 2) Spiraled dust cloud diluting into the arms (seamless join at the rim).
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position',    new THREE.BufferAttribute(buffers.positions, 3));
  dustGeo.setAttribute('aColor',      new THREE.BufferAttribute(buffers.colors,    3));
  dustGeo.setAttribute('aSize',       new THREE.BufferAttribute(buffers.sizes,     1));
  dustGeo.setAttribute('aTangent',    new THREE.BufferAttribute(buffers.tangents,  2));
  dustGeo.setAttribute('aStretch',    new THREE.BufferAttribute(buffers.stretches, 1));
  dustGeo.setAttribute('aVisibility', new THREE.BufferAttribute(buffers.visibility, 1));

  const dustMaterial = new THREE.ShaderMaterial(createCenterDustMaterialDef());
  const dust = new THREE.Points(dustGeo, dustMaterial);
  dust.frustumCulled = false;
  object3D.add(dust);

  return { object3D, discMaterial, dustMaterial };
}
