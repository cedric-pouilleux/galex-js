import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * Builds a 2-line CSS2DObject anchored to the centre of a cube. Vertical offset
 * is delegated to CSS (`margin-top` on `.cube-label`) so the label stays glued
 * just above the wireframe whatever the camera angle — translating the
 * CSS2DObject in 3D would drift in perspective when the galaxy rotates.
 */
export function makeCubeLabel(variant: string): CSS2DObject {
  const el = document.createElement('div');
  el.className = `cube-label ${variant}`;
  el.innerHTML = `<div class="coord">—</div><div class="count">—</div>`;
  const obj = new CSS2DObject(el);
  obj.position.set(0, 0, 0);
  return obj;
}

/**
 * Updates the coord + count lines of a cube label. Flat galaxy: only i and k
 * are shown; j is always 0 and not surfaced.
 */
export function setLabel(label: CSS2DObject, i: number, k: number, count: number): void {
  const el = label.element;
  (el.children[0] as HTMLElement).textContent = `[${i}, ${k}]`;
  (el.children[1] as HTMLElement).textContent = count === 1 ? '1 étoile' : `${count.toLocaleString('fr-FR')} étoiles`;
}
