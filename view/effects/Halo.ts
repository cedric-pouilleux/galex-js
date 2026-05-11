import * as THREE from 'three';
import { HALO_VERT, HALO_FRAG } from './Shaders.js';
import type { ShaderMaterialDef } from './Shaders.js';

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
