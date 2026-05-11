import * as THREE from 'three';
import { blackbodyRGB } from '../../core/StarColor.js';
import { createSelectionRing } from './SelectionRing.js';

/**
 * Constant apparent ring size. Mesh scale is computed each frame as
 * `RING_SCREEN_BASE × distance(mesh, camera)`, so the ring keeps the same
 * angular size on screen regardless of how close the camera is to the star.
 * Tuned to leave the star sprite clearly visible inside the ring.
 */
const RING_SCREEN_BASE = 0.05;

export type HoverRing = {
  /** The Three mesh — add it to the scene graph. */
  readonly object: THREE.Mesh;
  /** Anchor the ring on a star inside a `THREE.Points` cloud. Tints by temperature when known. */
  showOn(field: THREE.Points, starIndex: number, camera: THREE.Camera, temp: number | null): void;
  /** Per-frame hook — recomputes scale (constant on-screen size) and faces the camera. */
  update(camera: THREE.Camera, time: number): void;
  hide(): void;
};

/**
 * Hover indicator displayed when the user mouses over a star in the close-up.
 * Composes `createSelectionRing` (the shared shader primitive) with star-cloud
 * specifics: position from the cloud's `position` buffer, tint from
 * `blackbodyRGB(temp)`, and a constant-apparent-size scaling that decouples
 * the ring's on-screen footprint from the star's `aSize` and camera distance.
 */
export function createHoverRing(): HoverRing {
  const ring = createSelectionRing({ pulse: true });

  function applyDistanceScale(camera: THREE.Camera): void {
    const distance = ring.object.position.distanceTo(camera.position);
    ring.setSize(RING_SCREEN_BASE * distance);
  }

  function showOn(field: THREE.Points, starIndex: number, camera: THREE.Camera, temp: number | null): void {
    const positions = field.geometry.attributes.position.array as Float32Array;
    ring.setPosition(
      positions[starIndex * 3 + 0],
      positions[starIndex * 3 + 1],
      positions[starIndex * 3 + 2],
    );

    if (temp && temp > 0) {
      const [r, g, b] = blackbodyRGB(temp);
      // Lift the tint towards white so the ring stays readable on cold stars.
      ring.setColor([0.5 + r * 0.5, 0.5 + g * 0.5, 0.5 + b * 0.5]);
    } else {
      ring.setColor(0xffffff);
    }

    applyDistanceScale(camera);
    ring.update(camera, 0);
    ring.show();
  }

  function update(camera: THREE.Camera, time: number): void {
    if (!ring.object.visible) return;
    applyDistanceScale(camera);
    ring.update(camera, time);
  }

  return {
    object: ring.object,
    showOn,
    update,
    hide: ring.hide,
  };
}
