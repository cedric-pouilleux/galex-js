import * as THREE from 'three';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';

const DEFAULT_LINEWIDTH = 2;
const DEFAULT_DASH_SIZE = 0.35;
const DEFAULT_GAP_SIZE  = 0.22;
const DEFAULT_OPACITY   = 0.85;
const PULSE_FREQ_HZ     = 1.6 / (2 * Math.PI);

export type DashedPathOptions = {
  /** Line tint. Required so callers think about palette. */
  color: THREE.ColorRepresentation;
  /** Line thickness in screen pixels. Default 2. */
  linewidth?: number;
  /** Dash + gap geometry, in world units. Defaults tuned for close-up readability. */
  dashSize?: number;
  gapSize?: number;
  /** Base opacity. Default 0.85. */
  opacity?: number;
  /**
   * Dash scroll speed in world units per second (positive flows A → B). Set to 0
   * for a static look (measurement). Default 0.
   */
  dashScrollSpeed?: number;
  /**
   * Opacity breathing amplitude (±). 0 = static. Default 0. A value of 0.15
   * gives a gentle pulse that reads as "live" without competing with the dash.
   */
  pulseAmp?: number;
};

export type DashedPath = {
  /**
   * Group containing the line. Add it to your scene graph, or `.add()` your
   * own children to it (arrow heads, particle streams, glow sprites) — they
   * inherit the same parent transform as the line.
   */
  readonly object3D: THREE.Group;
  /**
   * Underlying `LineMaterial`. Exposed so callers can push custom uniforms,
   * inject GLSL via `onBeforeCompile`, or tweak the dash/colour at runtime.
   */
  readonly material: LineMaterial;
  /**
   * Underlying `LineGeometry`. Exposed for callers that want direct buffer
   * control (e.g. multi-segment paths via their own positions array).
   */
  readonly geometry: LineGeometry;
  /** Re-route the path between two endpoints, in the parent's local space. */
  setEndpoints(a: THREE.Vector3, b: THREE.Vector3): void;
  show(): void;
  hide(): void;
  /** Forward the viewport size — required for screen-space line width to look right. */
  setResolution(width: number, height: number): void;
  /**
   * Per-frame hook. Animates dash scroll + opacity pulse when the corresponding
   * options are non-zero; pure no-op otherwise (static look pays nothing).
   */
  update(time: number): void;
  dispose(): void;
};

/**
 * Dashed path between two endpoints. Visual building block for:
 * - **static measurements** — default options (no animation), a quiet
 *   dashed line that reads as "this is a measurement".
 * - **dynamic trajectories** — set `dashScrollSpeed` and/or `pulseAmp` to
 *   bring the path to life (e.g. a fleet moving from one star to another).
 *
 * ### Extension hooks
 * The primitive is intentionally small. Callers extend it without forking:
 * - `object3D` is a `THREE.Group` — `.add()` your own meshes (arrow tip at B,
 *   `THREE.Points` particle stream, glow billboard) and they follow the same
 *   parent transform.
 * - `material` exposes the underlying `LineMaterial` — use `onBeforeCompile`
 *   to inject GLSL chunks, or push custom uniforms each frame.
 * - `geometry` exposes the underlying `LineGeometry` — overwrite positions
 *   for multi-segment paths or curves (re-call `computeLineDistances()` on
 *   the line manually if you go that route).
 */
export function createDashedPath(options: DashedPathOptions): DashedPath {
  const {
    color,
    linewidth       = DEFAULT_LINEWIDTH,
    dashSize        = DEFAULT_DASH_SIZE,
    gapSize         = DEFAULT_GAP_SIZE,
    opacity         = DEFAULT_OPACITY,
    dashScrollSpeed = 0,
    pulseAmp        = 0,
  } = options;

  const group = new THREE.Group();
  group.visible = false;

  const geometry = new LineGeometry();
  geometry.setPositions([0, 0, 0, 0, 0, 0]);

  const material = new LineMaterial({
    color,
    linewidth,
    transparent: true,
    opacity,
    depthTest: false,
    dashed: true,
    dashSize,
    gapSize,
  });
  // Sensible default so the line renders correctly before the first
  // `setResolution` call. Guarded for Node test environments.
  if (typeof window !== 'undefined') {
    material.resolution.set(window.innerWidth, window.innerHeight);
  }

  const line = new Line2(geometry, material);
  line.computeLineDistances();
  line.renderOrder = 1100;
  group.add(line);

  function setEndpoints(a: THREE.Vector3, b: THREE.Vector3): void {
    geometry.setPositions([a.x, a.y, a.z, b.x, b.y, b.z]);
    line.computeLineDistances();
  }

  function show(): void { group.visible = true; }
  function hide(): void { group.visible = false; }

  function setResolution(width: number, height: number): void {
    material.resolution.set(width, height);
  }

  function update(time: number): void {
    if (!group.visible) return;
    if (dashScrollSpeed !== 0) {
      // Negative offset → dash pattern flows in the A → B direction.
      material.dashOffset = -time * dashScrollSpeed;
    }
    if (pulseAmp !== 0) {
      material.opacity = opacity + pulseAmp * Math.sin(time * 2 * Math.PI * PULSE_FREQ_HZ);
    }
  }

  function dispose(): void {
    geometry.dispose();
    material.dispose();
  }

  return {
    object3D: group,
    material,
    geometry,
    setEndpoints,
    show,
    hide,
    setResolution,
    update,
    dispose,
  };
}
