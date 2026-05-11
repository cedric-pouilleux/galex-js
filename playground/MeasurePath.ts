import * as THREE from 'three';
import { createDashedPath, type DashedPath } from '../view/paths/DashedPath.js';
import { createSelectionRing, type SelectionRing } from '../view/closeup/SelectionRing.js';

/**
 * Dash / gap in world units. Picked small enough that the polyline reads as a
 * "trace this route" hint rather than a hard line, even across short hops.
 */
const DASH_SIZE = 0.12;
const GAP_SIZE = 0.08;
const LINE_OPACITY = 0.85;
/** Apparent ring size at the screen, in screen-units; multiplied by camera distance per frame. */
const STOP_RING_SCREEN_BASE = 0.03;

export type MeasurePathOptions = {
  color: THREE.ColorRepresentation;
};

export type MeasurePath = {
  /** Group containing the polyline and intermediate-stop markers. */
  readonly object3D: THREE.Group;
  /**
   * Re-route the path through `stops` (≥ 2 points, in the parent's local
   * space). The first and last points are the endpoints A and B — those are
   * marked by `MeasureTool` itself, so only the *intermediate* points get a
   * ring here.
   */
  setStops(stops: readonly THREE.Vector3[]): void;
  show(): void;
  hide(): void;
  setResolution(width: number, height: number): void;
  /**
   * Per-frame hook: keeps every intermediate ring at a constant on-screen
   * size by recomputing its scale as `STOP_RING_SCREEN_BASE × distance(ring, camera)`.
   */
  update(camera: THREE.Camera, time: number): void;
  dispose(): void;
};

/**
 * Multi-stop route visual for the measurement tool: one dashed segment per hop
 * along the route, plus a soft ring around each intermediate stop. Endpoints A
 * and B keep `MeasureTool`'s own markers.
 *
 * **Why one segment per hop and not a single `LineGeometry` polyline?** Re-using
 * `LineGeometry.setPositions` with a varying point count caused only the first
 * segment to render on subsequent updates — the instanced buffer rebuild
 * apparently doesn't always propagate. A pool of two-point `DashedPath`s is
 * a tiny extra cost (≤ 30 hops in practice) and side-steps the issue entirely.
 *
 * Rings are sized per-frame to look the same on screen regardless of camera
 * distance (same trick as the locked star-mode marker in `MeasureTool`), so
 * a route that crosses several cubes doesn't put a giant disc on top of the
 * close-up sprites.
 */
export function createMeasurePath({ color }: MeasurePathOptions): MeasurePath {
  const group = new THREE.Group();
  group.visible = false;

  const segGroup = new THREE.Group();
  group.add(segGroup);
  const segments: DashedPath[] = [];

  const stopGroup = new THREE.Group();
  group.add(stopGroup);
  const stopRings: SelectionRing[] = [];

  let viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  let viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  function clearSegments(): void {
    for (const seg of segments) {
      segGroup.remove(seg.object3D);
      seg.dispose();
    }
    segments.length = 0;
  }

  function clearStops(): void {
    for (const ring of stopRings) {
      stopGroup.remove(ring.object);
      (ring.object.geometry as THREE.BufferGeometry).dispose();
      (ring.object.material as THREE.Material).dispose();
    }
    stopRings.length = 0;
  }

  function setStops(stops: readonly THREE.Vector3[]): void {
    if (stops.length < 2) {
      hide();
      return;
    }
    clearSegments();
    for (let i = 0; i < stops.length - 1; i++) {
      const seg = createDashedPath({
        color,
        dashSize: DASH_SIZE,
        gapSize: GAP_SIZE,
        opacity: LINE_OPACITY,
      });
      seg.setResolution(viewportWidth, viewportHeight);
      seg.setEndpoints(stops[i], stops[i + 1]);
      seg.show();
      segGroup.add(seg.object3D);
      segments.push(seg);
    }
    clearStops();
    // Skip endpoints (0 and last) — MeasureTool draws those itself.
    for (let i = 1; i < stops.length - 1; i++) {
      const ring = createSelectionRing({ color, pulse: false });
      ring.object.renderOrder = 1099;
      ring.setPosition(stops[i].x, stops[i].y, stops[i].z);
      ring.show();
      stopGroup.add(ring.object);
      stopRings.push(ring);
    }
  }

  function show(): void { group.visible = true; }
  function hide(): void { group.visible = false; }

  function setResolution(width: number, height: number): void {
    viewportWidth = width;
    viewportHeight = height;
    for (const seg of segments) seg.setResolution(width, height);
  }

  function update(camera: THREE.Camera, time: number): void {
    if (!group.visible) return;
    for (const ring of stopRings) {
      const distance = ring.object.position.distanceTo(camera.position);
      ring.setSize(STOP_RING_SCREEN_BASE * distance);
      ring.update(camera, time);
    }
  }

  function dispose(): void {
    clearSegments();
    clearStops();
  }

  return { object3D: group, setStops, show, hide, setResolution, update, dispose };
}
