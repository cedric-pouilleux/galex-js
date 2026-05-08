import * as THREE from 'three';
import { HALO_VERT, HALO_FRAG } from './Shaders.js';
import type { ShaderMaterialDef } from './Shaders.js';

export type HaloOptions = {
  radius: number;
  color?: number;
  intensity?: number;
};

/** Material def for the halo layer (a flat circle behind the disk). */
export function createHaloMaterialDef({
  color = 0xffaa66,
  intensity = 1.0,
}: { color?: number; intensity?: number } = {}): ShaderMaterialDef {
  return {
    vertexShader: HALO_VERT,
    fragmentShader: HALO_FRAG,
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

/** Halo geometry: a flat circle scaled to 1.45× the disk radius. */
export function createHaloGeometry(radius: number): THREE.CircleGeometry {
  return new THREE.CircleGeometry(radius * 1.45, 96);
}

/**
 * Builds the soft circular halo behind the disk. TresJS callers consume
 * `createHaloGeometry` + `createHaloMaterialDef` and rotate the mesh themselves.
 */
export function createHalo({
  radius,
  color = 0xffaa66,
  intensity = 1.0,
}: HaloOptions): THREE.Mesh {
  const geo = createHaloGeometry(radius);
  const mat = new THREE.ShaderMaterial(createHaloMaterialDef({ color, intensity }));
  const halo = new THREE.Mesh(geo, mat);
  halo.rotation.x = -Math.PI / 2;
  halo.name = 'halo';
  return halo;
}
