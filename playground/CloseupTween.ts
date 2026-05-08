import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Animates a perspective camera + orbit controls toward a target position and
 * look-at point. Pure animation: no state retained beyond the rAF chain it
 * starts. Calling it again while a previous tween runs simply overlays —
 * `lerpVectors` smooths through whatever the current values are.
 */
export function tweenCamera(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  toPos: THREE.Vector3,
  toTarget: THREE.Vector3,
  duration = 600,
): void {
  const fromPos = camera.position.clone();
  const fromTarget = controls.target.clone();
  const t0 = performance.now();
  function tick() {
    const t = Math.min(1, (performance.now() - t0) / duration);
    const e = easeOutCubic(t);
    camera.position.lerpVectors(fromPos, toPos, e);
    controls.target.lerpVectors(fromTarget, toTarget, e);
    if (t < 1) requestAnimationFrame(tick);
  }
  tick();
}
