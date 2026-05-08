import * as THREE from 'three';
import type { CubeGrid, Cube } from '../core/CubeGrid.js';

const CLICK_DRAG_THRESHOLD_PX = 4;
const CLICK_HOLD_THRESHOLD_MS = 400;

export type PickerHandlers = {
  /** Fired on a tap (no drag, no long-hold). */
  onClick?: (e: PointerEvent) => void;
};

export type Picker = {
  readonly pointer: THREE.Vector2;
  readonly pointerActive: boolean;
  readonly pointerClientX: number;
  readonly pointerClientY: number;
  bindPointerEvents(handlers?: PickerHandlers): void;
  pickCube(camera: THREE.Camera, root: THREE.Object3D, grid: CubeGrid): Cube | null;
};

/**
 * Thin wrapper around the canvas pointer state + a raycaster reused frame-to-frame.
 * Owns no scene knowledge — the caller passes the camera and the local grid each pick.
 */
export function createPicker(canvas: HTMLElement): Picker {
  const pointer = new THREE.Vector2();
  let pointerActive = false;
  let pointerClientX = 0;
  let pointerClientY = 0;

  const raycaster = new THREE.Raycaster();
  raycaster.params.Points!.threshold = 0.18;

  const invMat = new THREE.Matrix4();
  const rayOrigin = new THREE.Vector3();
  const rayDir = new THREE.Vector3();

  let downX = 0;
  let downY = 0;
  let downT = 0;

  function updatePointerFromEvent(e: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    pointerClientX = e.clientX;
    pointerClientY = e.clientY;
  }

  /**
   * Wires pointer events on the canvas. The caller receives a callback when the
   * user produces a click (tap), with the pointer state already updated to the
   * up-event coordinates so a follow-up `pickCube` call will be coherent.
   *
   * Event handlers as parameters are unavoidable here — they bridge raw DOM
   * events to app logic, which is the canonical "force majeur" exception.
   */
  function bindPointerEvents(handlers: PickerHandlers = {}): void {
    canvas.addEventListener('pointermove', (e) => {
      updatePointerFromEvent(e);
      pointerActive = true;
    });
    canvas.addEventListener('pointerleave', () => {
      pointerActive = false;
    });
    canvas.addEventListener('pointerdown', (e) => {
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
    });
    canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0) return;
      const dt = performance.now() - downT;
      const dx = Math.abs(e.clientX - downX);
      const dy = Math.abs(e.clientY - downY);
      if (dx > CLICK_DRAG_THRESHOLD_PX || dy > CLICK_DRAG_THRESHOLD_PX) return;
      if (dt > CLICK_HOLD_THRESHOLD_MS) return;
      updatePointerFromEvent(e);
      handlers.onClick?.(e);
    });
  }

  /**
   * Casts a ray from the current pointer through the active camera into a
   * THREE.Object3D's local space, then walks the cube grid via Amanatides & Woo.
   */
  function pickCube(camera: THREE.Camera, root: THREE.Object3D, grid: CubeGrid): Cube | null {
    raycaster.setFromCamera(pointer, camera);
    root.updateMatrixWorld();
    invMat.copy(root.matrixWorld).invert();
    rayOrigin.copy(raycaster.ray.origin).applyMatrix4(invMat);
    rayDir.copy(raycaster.ray.direction).transformDirection(invMat);
    return grid.pickCube(rayOrigin, rayDir);
  }

  return {
    pointer,
    get pointerActive() { return pointerActive; },
    get pointerClientX() { return pointerClientX; },
    get pointerClientY() { return pointerClientY; },
    bindPointerEvents,
    pickCube,
  };
}
