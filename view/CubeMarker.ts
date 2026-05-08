import * as THREE from 'three';
import { createCubeWireframe } from './GridHelper.js';

export type CubeMarkerOptions = {
  /** Hex colour for wireframe and plan-view halo. */
  color?: number;
  /** Hex colour for the filled body. */
  bodyColor?: number;
  /** Body opacity in orbit (additive blending). */
  bodyOpacity?: number;
  /** Body opacity in plan view (normal blending). */
  planBodyOpacity?: number;
  /** Flat halo opacity in plan view. */
  planHaloOpacity?: number;
  /** Thick-line width in pixels. */
  wireWidth?: number;
};

export type CubeMarker = {
  readonly object3D: THREE.Group;
  setPlanView(active: boolean): void;
};

/**
 * Marker around a single cube. Visually layered so it reads in both perspective
 * and orthographic views: a filled additive body, a thick wireframe, and a flat
 * halo on top that only shows when plan view is active.
 */
export function createCubeMarker(cubeSize: number, opts: CubeMarkerOptions = {}): CubeMarker {
  const {
    color = 0x7fff9f,
    bodyColor = 0x55ee70,
    bodyOpacity = 0.22,
    planBodyOpacity = 0.6,
    planHaloOpacity = 0.55,
    wireWidth = 2.5,
  } = opts;

  const object3D = new THREE.Group();
  object3D.name = 'cubeMarker';

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize),
    new THREE.MeshBasicMaterial({
      color: bodyColor,
      transparent: true,
      opacity: bodyOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  object3D.add(body);

  const wire = createCubeWireframe(cubeSize, color, { linewidth: wireWidth, opacity: 1.0 });
  wire.renderOrder = 1000;
  object3D.add(wire);

  // Flat halo on the top face — invisible in perspective, makes the marker
  // legible from above in plan view.
  const halo = new THREE.Mesh(
    new THREE.PlaneGeometry(cubeSize * 1.15, cubeSize * 1.15),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: planHaloOpacity,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = cubeSize * 0.501;
  halo.renderOrder = 999;
  halo.visible = false;
  object3D.add(halo);

  function setPlanView(active: boolean): void {
    halo.visible = active;
    // Additive blending washes out on the flat dark backdrop in plan view; swap
    // to normal blending with stronger opacity so the marker stays readable.
    const mat = body.material as THREE.MeshBasicMaterial;
    if (active) {
      mat.blending = THREE.NormalBlending;
      mat.opacity = planBodyOpacity;
    } else {
      mat.blending = THREE.AdditiveBlending;
      mat.opacity = bodyOpacity;
    }
    mat.needsUpdate = true;
  }

  return { object3D, setPlanView };
}
