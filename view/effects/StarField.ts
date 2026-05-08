import * as THREE from 'three';
import { getDevicePixelRatio } from './Shaders.js';
import type { ShaderMaterialDef } from './Shaders.js';

const VERT = /* glsl */`
attribute float aSize;
attribute vec3 aColor;
attribute float aVisibility;
varying vec3 vColor;
varying float vVis;
varying vec3 vWorldPos;
varying float vSizeAtten;
uniform float uPixelRatio;
uniform float uSizeScale;
uniform float uOrthoSize;

void main() {
  vColor = aColor;
  vVis = aVisibility;
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  float requested;
  if (uOrthoSize > 0.0) {
    requested = aSize * uSizeScale * uPixelRatio * uOrthoSize;
  } else {
    float dist = max(-mv.z, 1.0);
    requested = aSize * uSizeScale * uPixelRatio * (130.0 / dist);
  }
  // Size floor: below ~2 px sprites flicker as the galaxy rotates (sub-pixel
  // instability in the smoothstep). Clamp the size then refund the energy via
  // vSizeAtten so the faintest stars don't appear oversized.
  float floorPx = 2.5 * uPixelRatio;
  gl_PointSize = max(requested, floorPx);
  float ratio = requested / floorPx;
  vSizeAtten = min(1.0, ratio * ratio);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */`
varying vec3 vColor;
varying float vVis;
varying vec3 vWorldPos;
varying float vSizeAtten;
uniform float uDim;
uniform vec4 uClipPlane;
uniform float uClipActive;

void main() {
  if (uClipActive > 0.5 && dot(uClipPlane.xyz, vWorldPos) + uClipPlane.w < 0.0) discard;
  if (vVis < 0.01) discard;
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  // Soft edge (plateau up to 0.1, ramp to 0.5): the transition spreads across
  // more pixels, so it is less sensitive to sub-pixel jitter.
  float core = smoothstep(0.5, 0.1, d);
  float halo = smoothstep(0.5, 0.2, d) * 0.55;
  float a = clamp(core + halo, 0.0, 1.0) * vVis * uDim * vSizeAtten;
  // No final discard: we let alpha-blending smooth the edge rather than cut it
  // sharply (which is the source of the flicker).
  gl_FragColor = vec4(vColor, a);
}
`;

export type StarFieldOptions = {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  pixelRatio?: number;
  sizeScale?: number;
};

/** Allocates the per-star visibility attribute (defaults to 1 everywhere). */
export function createStarFieldVisibility(starCount: number): Float32Array {
  const visibility = new Float32Array(starCount);
  visibility.fill(1);
  return visibility;
}

/** Material def for the star field — reusable by both Three impératif and TresJS. */
export function createStarFieldMaterialDef({
  pixelRatio,
  sizeScale = 1,
}: { pixelRatio?: number; sizeScale?: number } = {}): ShaderMaterialDef {
  return {
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uPixelRatio: { value: pixelRatio ?? getDevicePixelRatio() },
      uSizeScale:  { value: sizeScale },
      uOrthoSize:  { value: 0.0 },
      uDim:        { value: 1.0 },
      uClipPlane:  { value: new THREE.Vector4(0, 0, 1, 0) },
      uClipActive: { value: 0.0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  };
}

/**
 * Builds the star field as a `THREE.Points`. TresJS callers consume the
 * raw star buffers (already provided by `GalaxyData`) plus
 * `createStarFieldVisibility` and `createStarFieldMaterialDef` directly.
 */
export function createStarField({
  positions, colors, sizes, pixelRatio, sizeScale = 1,
}: StarFieldOptions): THREE.Points {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('aColor',   new THREE.BufferAttribute(colors,    3));
  geo.setAttribute('aSize',    new THREE.BufferAttribute(sizes,     1));
  geo.setAttribute('aVisibility', new THREE.BufferAttribute(createStarFieldVisibility(positions.length / 3), 1));

  const mat = new THREE.ShaderMaterial(createStarFieldMaterialDef({ pixelRatio, sizeScale }));
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return points;
}
