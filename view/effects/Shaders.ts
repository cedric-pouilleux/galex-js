// GLSL constants and tinted palettes shared across the gas/nebula/halo factories.
// Kept in one place so the per-layer factories stay focused on geometry generation.

import * as THREE from 'three';

export const NEBULA_PALETTE: readonly [number, number, number][] = [
  [1.00, 0.34, 0.46], // pink — H-alpha, HII regions
  [0.30, 0.55, 1.00], // blue — reflection nebulae
  [0.78, 0.32, 0.96], // violet — emission
  [1.00, 0.58, 0.30], // sepia — dust glow
  [0.42, 0.86, 0.92], // cyan — planetary nebulae
  [0.58, 0.30, 0.72], // dark purple — molecular clouds
];

export const STREAK_PALETTE: readonly [number, number, number][] = [
  [0.85, 0.42, 0.55],
  [0.45, 0.55, 0.85],
  [0.78, 0.60, 0.38],
  [0.65, 0.45, 0.78],
  [0.45, 0.72, 0.78],
  [0.80, 0.58, 0.40],
  [0.55, 0.78, 0.55],
];

export const HAZE_PALETTE: readonly [number, number, number][] = [
  [0.30, 0.42, 0.58],
  [0.52, 0.45, 0.58],
  [0.55, 0.50, 0.42],
  [0.40, 0.52, 0.56],
  [0.48, 0.40, 0.50],
];

export const ARM_GLOW_PALETTE: readonly [number, number, number][] = [
  [0.92, 0.65, 0.70],
  [0.65, 0.75, 0.95],
  [0.92, 0.78, 0.55],
  [0.65, 0.90, 0.88],
  [0.85, 0.65, 0.92],
  [0.95, 0.85, 0.62],
];

export const NEBULA_VERT = /* glsl */`
attribute float aSize;
attribute vec3 aColor;
attribute float aVisibility;
varying vec3 vColor;
varying float vVis;
varying vec3 vWorldPos;
uniform float uPixelRatio;
uniform float uOrthoSize;
void main() {
  vColor = aColor;
  vVis = aVisibility;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  if (uOrthoSize > 0.0) {
    gl_PointSize = aSize * uPixelRatio * uOrthoSize;
  } else {
    float dist = max(-mv.z, 1.0);
    gl_PointSize = aSize * uPixelRatio * (180.0 / dist);
  }
  gl_Position = projectionMatrix * mv;
}`;

export const NEBULA_FRAG = /* glsl */`
varying vec3 vColor;
varying float vVis;
varying vec3 vWorldPos;
uniform float uDim;
uniform vec4 uClipPlane;
uniform float uClipActive;
void main() {
  if (uClipActive > 0.5 && dot(uClipPlane.xyz, vWorldPos) + uClipPlane.w < 0.0) discard;
  if (vVis < 0.01) discard;
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv) * 2.0;
  float a = exp(-d * d * 2.2) * 0.32 * vVis * uDim;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor, a);
}`;

// Stretched point sprite: receives a 2D world tangent (XZ plane), projects it
// to screen space, then in fragment rotates the local UV to align with that
// direction and applies an anisotropic falloff (long along tangent, sharp across).
export const STRETCH_VERT = /* glsl */`
attribute float aSize;
attribute vec3 aColor;
attribute vec2 aTangent;
attribute float aStretch;
attribute float aVisibility;
varying vec3 vColor;
varying vec2 vTan;
varying float vStretch;
varying float vVis;
varying vec3 vWorldPos;
uniform float uPixelRatio;
uniform float uOrthoSize;
void main() {
  vColor = aColor;
  vStretch = aStretch;
  vVis = aVisibility;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vec3 tView = (modelViewMatrix * vec4(aTangent.x, 0.0, aTangent.y, 0.0)).xyz;
  vec2 t2 = tView.xy;
  float l = max(length(t2), 1e-5);
  vTan = t2 / l;
  float sizeMult = mix(1.0, 2.6, aStretch);
  if (uOrthoSize > 0.0) {
    gl_PointSize = aSize * sizeMult * uPixelRatio * uOrthoSize;
  } else {
    float dist = max(-mv.z, 1.0);
    gl_PointSize = aSize * sizeMult * uPixelRatio * (180.0 / dist);
  }
  gl_Position = projectionMatrix * mv;
}`;

export const STRETCH_FRAG = /* glsl */`
varying vec3 vColor;
varying vec2 vTan;
varying float vStretch;
varying float vVis;
varying vec3 vWorldPos;
uniform float uDim;
uniform vec4 uClipPlane;
uniform float uClipActive;
void main() {
  if (uClipActive > 0.5 && dot(uClipPlane.xyz, vWorldPos) + uClipPlane.w < 0.0) discard;
  if (vVis < 0.01) discard;
  vec2 uv = (gl_PointCoord - 0.5) * 2.0;
  uv.y = -uv.y;
  vec2 perp = vec2(-vTan.y, vTan.x);
  float along  = dot(uv, vTan);
  float across = dot(uv, perp);
  float aspect = mix(1.0, 4.5, vStretch);
  float sa = along;
  float sb = across * aspect;
  float d2 = sa * sa + sb * sb;
  float a = exp(-d2 * 1.4) * 0.16 * vVis * uDim;
  if (a < 0.003) discard;
  gl_FragColor = vec4(vColor, a);
}`;

export const HALO_VERT = /* glsl */`
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv - 0.5;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

export const HALO_FRAG = /* glsl */`
varying vec2 vUv;
varying vec3 vWorldPos;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uDim;
uniform vec4 uClipPlane;
uniform float uClipActive;
void main() {
  if (uClipActive > 0.5 && dot(uClipPlane.xyz, vWorldPos) + uClipPlane.w < 0.0) discard;
  float d = length(vUv) * 2.0;
  float gauss = exp(-d * d * 1.8);
  float fade  = smoothstep(1.0, 0.45, d);
  float a = gauss * fade * uIntensity * uDim;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor, a);
}`;

// Central bulge: a soft warm (yellow-orange) disc + a dust cloud that follows
// the spiral pattern so it visually merges with the arms rather than reading
// as an isolated ball at the centre.
export const CENTER_DISC_FRAG = /* glsl */`
varying vec2 vUv;
varying vec3 vWorldPos;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uDim;
uniform vec4 uClipPlane;
uniform float uClipActive;
void main() {
  if (uClipActive > 0.5 && dot(uClipPlane.xyz, vWorldPos) + uClipPlane.w < 0.0) discard;
  float d = length(vUv) * 2.0;
  // Gaussian peak at the centre + smoothstep fade at the rim so the disc
  // decays smoothly to 0 before reaching the polygon edge — otherwise the
  // geometry boundary shows up as a hard circular cut.
  float core = exp(-d * d * 0.55);
  float edge = smoothstep(1.0, 0.35, d);
  float a = core * edge * uIntensity * uDim;
  if (a < 0.002) discard;
  gl_FragColor = vec4(uColor, a);
}`;

/** Shared device-pixel-ratio resolver — guards against headless Node where `window` is absent. */
export function getDevicePixelRatio(): number {
  return globalThis.devicePixelRatio ?? 1;
}

/**
 * Material definition reusable by both `new THREE.ShaderMaterial(def)` and
 * `<TresShaderMaterial v-bind="def">`. Carries no `THREE.Material` instance —
 * just the constructor parameters.
 */
export type ShaderMaterialDef = {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
  transparent: boolean;
  blending: THREE.Blending;
  depthWrite: boolean;
  side?: THREE.Side;
};

/**
 * Instantiates a live `THREE.ShaderMaterial` from a {@link ShaderMaterialDef}.
 * Spares non-Tres consumers (vanilla Three.js, custom renderers) from rewiring
 * the constructor params by hand; `side` is only set when the def carries it.
 */
export function createMaterialFromDef(def: ShaderMaterialDef): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: def.vertexShader,
    fragmentShader: def.fragmentShader,
    uniforms: def.uniforms as Record<string, THREE.IUniform>,
    transparent: def.transparent,
    blending: def.blending,
    depthWrite: def.depthWrite,
    ...(def.side != null ? { side: def.side } : {}),
  });
}

/** Standard uniforms shared by every additive Points layer (clipping plane + dim). */
export function createStandardPointsUniforms(): Record<string, { value: unknown }> {
  return {
    uPixelRatio: { value: getDevicePixelRatio() },
    uOrthoSize: { value: 0.0 },
    uDim: { value: 1.0 },
    uClipPlane: { value: new THREE.Vector4(0, 0, 1, 0) },
    uClipActive: { value: 0.0 },
  };
}

/** Builds a Points-layer material def from a (vertexShader, fragmentShader) pair. */
export function createPointsMaterialDef(vertexShader: string, fragmentShader: string): ShaderMaterialDef {
  return {
    vertexShader,
    fragmentShader,
    uniforms: createStandardPointsUniforms(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  };
}
