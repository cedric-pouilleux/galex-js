import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Cube } from '../core/CubeGrid.js';
import { cubeKey } from '../core/CubeGrid.js';
import { createCubeWireframe } from '../view/GridHelper.js';

const HIGHLIGHT_COLOR = 0x6cf2ff;
const HIGHLIGHT_LINEWIDTH = 3;

export type PaintSelectionDeps = {
  canvas: HTMLElement;
  /** Orbit controls disabled for the duration of a paint gesture. */
  controls: OrbitControls;
  /** Cube size used to size the highlight wireframes (constant across regens). */
  cubeSize: number;
  /** Initial parent for the highlight pool — re-set via `setParent` after regen. */
  parent: THREE.Object3D;
  /** Resolves the cube under a canvas-local position, or `null` when no cube is selectable. */
  pickCubeAt: (canvasX: number, canvasY: number) => Cube | null;
  /** Galaxy-local centre of a cube — used to place the wireframe. */
  cubeCenter: (cube: Cube) => { x: number; y: number; z: number };
};

export type PaintSelectionHandlers = {
  /** Called on pointerup with every cube the cursor visited during the drag (deduplicated). */
  onRelease: (cubes: readonly Cube[]) => void;
};

export type PaintSelection = {
  bind(handlers: PaintSelectionHandlers): void;
  /** Moves the highlight pool under a new node — call after a galaxy regen. */
  setParent(parent: THREE.Object3D): void;
  /** Drops any in-flight selection and hides every highlight wireframe. */
  clear(): void;
};

/**
 * Paint-style multi-cube selection.
 *
 * The drag must start ON a selectable cube (resolved via `pickCubeAt`):
 * - orbit rotation is suppressed for the gesture (`controls.enabled = false`),
 * - the picker's click is suppressed (`stopImmediatePropagation` in capture phase),
 * - every cube the cursor passes over is highlighted with a wireframe and added
 *   to the release set.
 *
 * Drags that start on empty space are passed through to the orbit controls
 * (rotation), so the gesture stays composable with the rest of the UI.
 *
 * The highlight pool is a set of cube wireframes parented to a caller-supplied
 * node so they track the galaxy's idle rotation.
 */
export function createPaintSelection(deps: PaintSelectionDeps): PaintSelection {
  const { canvas, controls, cubeSize, pickCubeAt, cubeCenter } = deps;

  const root = new THREE.Group();
  root.name = 'paintSelectionHighlights';
  deps.parent.add(root);

  const pool: ReturnType<typeof createCubeWireframe>[] = [];
  /** Painted cubes for the current gesture, keyed for O(1) dedup. */
  const selected = new Map<string, Cube>();
  let active = false;

  /** Returns slot `index` from the pool, growing it lazily. */
  function slot(index: number): ReturnType<typeof createCubeWireframe> {
    while (index >= pool.length) {
      const wire = createCubeWireframe(cubeSize, HIGHLIGHT_COLOR, { linewidth: HIGHLIGHT_LINEWIDTH });
      pool.push(wire);
      root.add(wire);
    }
    const wire = pool[index];
    wire.visible = true;
    return wire;
  }

  function paint(cube: Cube): void {
    const key = cubeKey(cube.i, cube.j, cube.k);
    if (selected.has(key)) return;
    const wire = slot(selected.size);
    const c = cubeCenter(cube);
    wire.position.set(c.x, c.y, c.z);
    selected.set(key, cube);
  }

  function hideHighlights(): void {
    for (const wire of pool) wire.visible = false;
  }

  function endGesture(): void {
    selected.clear();
    active = false;
    hideHighlights();
    controls.enabled = true;
  }

  function clear(): void {
    if (active) controls.enabled = true;
    selected.clear();
    active = false;
    hideHighlights();
  }

  function setParent(parent: THREE.Object3D): void {
    parent.add(root);
  }

  function canvasLocal(e: PointerEvent): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function bind(handlers: PaintSelectionHandlers): void {
    // Capture phase: runs before the picker's and OrbitControls' bubble-phase
    // pointerdown. When the drag starts on a cube we own the gesture entirely
    // — both downstream handlers are suppressed via stopImmediatePropagation.
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      const { x, y } = canvasLocal(e);
      const cube = pickCubeAt(x, y);
      if (!cube) return;

      active = true;
      controls.enabled = false;
      selected.clear();
      hideHighlights();
      paint(cube);
      // Pointer capture guarantees pointerup fires on the canvas even if the
      // user releases outside its bounds — otherwise `active` would leak true.
      canvas.setPointerCapture(e.pointerId);
      e.stopImmediatePropagation();
    }, true);

    canvas.addEventListener('pointermove', (e) => {
      if (!active) return;
      const { x, y } = canvasLocal(e);
      const cube = pickCubeAt(x, y);
      if (cube) paint(cube);
    });

    canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0 || !active) return;
      // Snapshot before `endGesture` clears the map.
      const cubes = Array.from(selected.values());
      // Hide highlights before notifying the host: opening the close-up dims
      // the galaxy, and the wireframes' depthTest: false material would
      // otherwise punch through that dim.
      endGesture();
      handlers.onRelease(cubes);
    });

    canvas.addEventListener('pointercancel', endGesture);
  }

  return { bind, setParent, clear };
}
