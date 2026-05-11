import * as THREE from 'three';

/** Object3D nodes that own GPU resources (geometry + material). */
function ownsGpuResources(
  node: THREE.Object3D,
): node is THREE.Mesh | THREE.Points | THREE.Line | THREE.LineSegments | THREE.Sprite {
  return node instanceof THREE.Mesh
      || node instanceof THREE.Points
      || node instanceof THREE.Line
      || node instanceof THREE.LineSegments
      || node instanceof THREE.Sprite;
}

/**
 * Releases the GPU resources owned by every descendant of `root`: geometry +
 * material(s). Safe on objects that hold neither (e.g. plain `THREE.Group`).
 *
 * Does not detach `root` from its parent — call `parent.remove(root)` first if
 * the host scene still references it.
 */
export function disposeObject3DTree(root: THREE.Object3D): void {
  root.traverse((node) => {
    if (!ownsGpuResources(node)) return;
    node.geometry.dispose();
    const material = node.material;
    if (Array.isArray(material)) material.forEach((m) => m.dispose());
    else material.dispose();
  });
}
