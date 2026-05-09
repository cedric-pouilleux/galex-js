import * as THREE from 'three';

/**
 * Releases the GPU resources owned by every descendant of `root`: geometry +
 * material(s). Safe on objects that hold neither (e.g. plain `THREE.Group`).
 *
 * Does not detach `root` from its parent — call `parent.remove(root)` first if
 * the host scene still references it.
 */
export function disposeObject3DTree(root: THREE.Object3D): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
      else (mesh.material as THREE.Material).dispose();
    }
  });
}
