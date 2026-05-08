import * as THREE from 'three';
import { blackbodyRGB } from '../../core/StarColor.js';

export type HoverRing = {
  /** The Three mesh — add it to the scene graph. */
  readonly object: THREE.Mesh;
  /** Anchor the ring on a star inside a `THREE.Points` cloud. Tints by temperature when known. */
  showOn(field: THREE.Points, starIndex: number, camera: THREE.Camera, temp: number | null): void;
  hide(): void;
};

/**
 * Hover indicator displayed when the user mouses over a star in the close-up.
 * Unit-radius geometry; `showOn` scales it by aSize × 0.4 so the diameter
 * matches the on-screen size of the target.
 */
export function createHoverRing(): HoverRing {
  const mesh = new THREE.Mesh(
    new THREE.RingGeometry(0.14, 0.16, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  mesh.visible = false;
  mesh.renderOrder = 1500;

  function showOn(field: THREE.Points, starIndex: number, camera: THREE.Camera, temp: number | null): void {
    const positions = field.geometry.attributes.position.array as Float32Array;
    const sizes     = field.geometry.attributes.aSize.array    as Float32Array;
    const x = positions[starIndex * 3 + 0];
    const y = positions[starIndex * 3 + 1];
    const z = positions[starIndex * 3 + 2];
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(sizes[starIndex] * 0.4);

    const mat = mesh.material as THREE.MeshBasicMaterial;
    if (temp && temp > 0) {
      const [r, g, b] = blackbodyRGB(temp);
      mat.color.setRGB(r, g, b);
    } else {
      mat.color.setRGB(1, 1, 1);
    }

    mesh.lookAt(camera.position);
    mesh.visible = true;
  }

  function hide(): void {
    mesh.visible = false;
  }

  return { object: mesh, showOn, hide };
}
