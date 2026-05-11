import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Cube } from '../core/CubeGrid.js';
import { createCubeWireframe } from '../view/GridHelper.js';

const ENDPOINT_COLOR = 0xffffff;
const ENDPOINT_LINEWIDTH = 3;
const ENDPOINT_OPACITY = 1;

const OUTLINE_COLOR = 0xffffff;
const OUTLINE_LINEWIDTH = 1.5;
const OUTLINE_OPACITY = 0.28;

export type RectBox = {
  minI: number;
  maxI: number;
  minK: number;
  maxK: number;
  j: number;
};

export type RectSelectionDeps = {
  canvas: HTMLElement;
  /** Orbit controls disabled for the duration of a rect-selection gesture. */
  controls: OrbitControls;
  /** Cube size used to size the highlight wireframes (constant across regens). */
  cubeSize: number;
  /** Initial parent for the highlight pool — re-set via `setParent` after regen. */
  parent: THREE.Object3D;
  /** Cube under (canvasX, canvasY), or null when no selectable cube is there. */
  pickCubeAt: (canvasX: number, canvasY: number) => Cube | null;
  /** Galaxy-local centre of any cube coordinate — the cube does not need to exist. */
  cubeCenterAt: (i: number, j: number, k: number) => { x: number; y: number; z: number };
  /** Returns a selectable cube at (i, j, k), or null if missing/non-visible. */
  getSelectableCube: (i: number, j: number, k: number) => Cube | null;
};

export type RectSelectionHandlers = {
  /** Called on pointerup with every selectable cube inside the rectangle. */
  onRelease: (cubes: readonly Cube[]) => void;
};

export type RectSelection = {
  bind(handlers: RectSelectionHandlers): void;
  /** Moves the highlight pool under a new node — call after a galaxy regen. */
  setParent(parent: THREE.Object3D): void;
  /** Drops any in-flight gesture and hides every highlight wireframe. */
  clear(): void;
};

/**
 * Axis-aligned grid-coordinate box spanned by anchor and current, projected
 * onto the anchor's j-plane. `current.j` is intentionally ignored so dragging
 * across cubes on a different vertical layer keeps the rectangle planar.
 */
export function rectBox(
  anchor: { i: number; j: number; k: number },
  current: { i: number; k: number },
): RectBox {
  return {
    minI: Math.min(anchor.i, current.i),
    maxI: Math.max(anchor.i, current.i),
    minK: Math.min(anchor.k, current.k),
    maxK: Math.max(anchor.k, current.k),
    j: anchor.j,
  };
}

/**
 * Coordinates of every cell on the rectangle's outline, excluding the anchor
 * and current cells (which are rendered as bright endpoints).
 */
export function outlineCoords(
  box: RectBox,
  anchor: { i: number; k: number },
  current: { i: number; k: number },
): { i: number; j: number; k: number }[] {
  const out: { i: number; j: number; k: number }[] = [];
  for (let i = box.minI; i <= box.maxI; i++) {
    for (let k = box.minK; k <= box.maxK; k++) {
      const onEdge = i === box.minI || i === box.maxI || k === box.minK || k === box.maxK;
      if (!onEdge) continue;
      if (i === anchor.i && k === anchor.k) continue;
      if (i === current.i && k === current.k) continue;
      out.push({ i, j: box.j, k });
    }
  }
  return out;
}

/** Every selectable cube contained in the box (interior + outline). */
export function cubesInBox(
  box: RectBox,
  getSelectableCube: (i: number, j: number, k: number) => Cube | null,
): Cube[] {
  const out: Cube[] = [];
  for (let i = box.minI; i <= box.maxI; i++) {
    for (let k = box.minK; k <= box.maxK; k++) {
      const cube = getSelectableCube(i, box.j, k);
      if (cube) out.push(cube);
    }
  }
  return out;
}

/**
 * Rectangular multi-cube selection.
 *
 * The drag must start ON a selectable cube (resolved via `pickCubeAt`):
 * - orbit rotation is suppressed for the gesture (`controls.enabled = false`),
 * - the picker's click is suppressed (`stopImmediatePropagation` in capture phase),
 * - an axis-aligned rectangle is traced between the anchor cube and the cube
 *   under the pointer.
 *
 * Visual feedback during the drag:
 * - anchor cube + current cube under the pointer → bright white wireframe,
 * - other cells on the rectangle's outline → faint white wireframe,
 * - interior cells → not drawn (keeps the gesture readable).
 *
 * Drags that start on empty space pass through to the orbit controls. On
 * pointerup, every selectable cube inside the rectangle is sent to `onRelease`.
 */
export function createRectSelection(deps: RectSelectionDeps): RectSelection {
  const { canvas, controls, cubeSize, pickCubeAt, cubeCenterAt, getSelectableCube } = deps;

  const root = new THREE.Group();
  root.name = 'rectSelectionHighlights';
  deps.parent.add(root);

  const endpointPool: ReturnType<typeof createCubeWireframe>[] = [];
  const outlinePool: ReturnType<typeof createCubeWireframe>[] = [];

  let anchor: Cube | null = null;
  let current: Cube | null = null;
  let active = false;

  function endpointSlot(index: number): ReturnType<typeof createCubeWireframe> {
    while (index >= endpointPool.length) {
      const wire = createCubeWireframe(cubeSize, ENDPOINT_COLOR, {
        linewidth: ENDPOINT_LINEWIDTH,
        opacity: ENDPOINT_OPACITY,
      });
      endpointPool.push(wire);
      root.add(wire);
    }
    const wire = endpointPool[index];
    wire.visible = true;
    return wire;
  }

  function outlineSlot(index: number): ReturnType<typeof createCubeWireframe> {
    while (index >= outlinePool.length) {
      const wire = createCubeWireframe(cubeSize, OUTLINE_COLOR, {
        linewidth: OUTLINE_LINEWIDTH,
        opacity: OUTLINE_OPACITY,
      });
      outlinePool.push(wire);
      root.add(wire);
    }
    const wire = outlinePool[index];
    wire.visible = true;
    return wire;
  }

  function hideAll(): void {
    for (const w of endpointPool) w.visible = false;
    for (const w of outlinePool) w.visible = false;
  }

  function placeWire(wire: ReturnType<typeof createCubeWireframe>, i: number, j: number, k: number): void {
    const c = cubeCenterAt(i, j, k);
    wire.position.set(c.x, c.y, c.z);
  }

  function refreshHighlights(): void {
    hideAll();
    if (!anchor) return;
    const cur = current ?? anchor;

    placeWire(endpointSlot(0), anchor.i, anchor.j, anchor.k);
    if (cur.i !== anchor.i || cur.k !== anchor.k) {
      placeWire(endpointSlot(1), cur.i, anchor.j, cur.k);
    }

    const box = rectBox(anchor, cur);
    const outline = outlineCoords(box, anchor, cur);
    for (let n = 0; n < outline.length; n++) {
      const c = outline[n];
      placeWire(outlineSlot(n), c.i, c.j, c.k);
    }
  }

  function endGesture(): void {
    anchor = null;
    current = null;
    active = false;
    hideAll();
    controls.enabled = true;
  }

  function clear(): void {
    endGesture();
  }

  function setParent(parent: THREE.Object3D): void {
    parent.add(root);
  }

  function canvasLocal(e: PointerEvent): { x: number; y: number } {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function bind(handlers: RectSelectionHandlers): void {
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
      anchor = cube;
      current = cube;
      refreshHighlights();
      // Pointer capture guarantees pointerup fires on the canvas even if the
      // user releases outside its bounds — otherwise `active` would leak true.
      canvas.setPointerCapture(e.pointerId);
      e.stopImmediatePropagation();
    }, true);

    canvas.addEventListener('pointermove', (e) => {
      if (!active || !anchor) return;
      const { x, y } = canvasLocal(e);
      const cube = pickCubeAt(x, y);
      // Empty-space hover: keep the last valid current cube — the preview stays stable.
      if (!cube) return;
      // Rectangle stays on the anchor's j-plane — ignore j of the hovered cube.
      current = cube;
      refreshHighlights();
    });

    canvas.addEventListener('pointerup', (e) => {
      if (e.button !== 0 || !active || !anchor) return;
      const box = rectBox(anchor, current ?? anchor);
      const cubes = cubesInBox(box, getSelectableCube);
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
