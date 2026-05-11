import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { worldUnitsToLightYears, lightYearsPerUnit } from '../core/Astronomy.js';
import { findStarPath, type StarPath } from '../core/Pathfinding.js';
import { createSelectionRing, type SelectionRing } from '../view/closeup/SelectionRing.js';
import { createDashedPath, type DashedPath } from '../view/paths/DashedPath.js';
import { createMeasurePath, type MeasurePath } from './MeasurePath.js';
import { cubeKey, type Cube } from '../core/CubeGrid.js';
import type { GalaxyData } from '../core/GalaxyData.js';

const COLOR = 0x6cf2ff;
/** Tint used when a path can't be completed within the configured jump range. */
const COLOR_UNREACHABLE = 0xff7878;
const MARKER_BASE_RADIUS = 0.45;
const CUBE_MARKER_OPACITY = 0.90;
/**
 * Constant apparent ring size in star mode. Mesh scale is recomputed each
 * frame as `STAR_RING_SCREEN_BASE × distance(mesh, camera)`, so the locked
 * marker keeps the same angular size on screen regardless of camera distance.
 */
const STAR_RING_SCREEN_BASE = 0.05;
/** Default jump range when no caller-supplied value has been set, in light-years. */
const DEFAULT_MAX_JUMP_LY = 5;

export type MeasureMode = 'cube' | 'star' | 'path';

/** Star-click sub-mode chosen by the UI ("Directe" vs. "Trajet par étoiles"). */
export type StarMeasureMode = 'direct' | 'path';

/**
 * Read-only snapshot of the current measurement's trajectory. Returned by
 * `MeasureTool.currentTrajectory(galaxy)` so callers can drive a HUD, persist a
 * route, validate a player action, etc. — without poking at the tool's state.
 */
export type TrajectoryInfo = {
  /** Cubes traversed in route order, deduplicated. Always length ≥ 1. */
  cubes: readonly Cube[];
  /** Total route length in world units. Use `worldUnitsToLightYears` to convert. */
  distance: number;
  /** Number of hops between endpoints: 1 in cube/star-direct, `stars.length - 1` in path mode. */
  hops: number;
  /** Star indices in route order (path mode). Empty in cube/star-direct modes. */
  stars: readonly number[];
  /** Longest single hop in world units. Equals `distance` outside path mode. */
  longestJump: number;
};

export type MeasureToolOptions = {
  /**
   * Fired whenever a successful pathfinding result lands on screen. The caller
   * receives the deduplicated list of cubes the route passes through — handy
   * to extend a close-up so the intermediate stops have real star sprites
   * underneath their rings rather than floating in dimmed space.
   *
   * Called once per second-click (or per range-slider re-route), not on each
   * frame. Not invoked when the path is `null` (out of range).
   */
  onPathComputed?: (cubes: readonly Cube[]) => void;
  /**
   * Fired when a previously-resolved path is invalidated: third pick that
   * resets the route, mode switch away from `path`, `clear()`, or `setEnabled(false)`.
   * Lets the caller drop trajectory-specific overlays (e.g. the close-up's
   * trajectory cubes) without polling the tool's internal state.
   */
  onPathCleared?: () => void;
  /**
   * Optional star-level filter. Stars for which it returns false cannot be
   * locked as endpoints or used as hover/path nodes — pickStar / setHoveredStar
   * become no-ops on filtered stars, and pathfinding skips them entirely.
   * Used by the caller to keep fog-hidden cubes out of measurements.
   */
  isStarMeasurable?: (starIndex: number) => boolean;
  /**
   * Fired when the user presses the focus key while a complete measurement is
   * on screen. The tool owns the key binding (window keydown) so the caller
   * doesn't have to wire one; the handler is skipped when an input/textarea is
   * focused and when the tool is disabled. Omit this option to disable the
   * key entirely.
   */
  onFocusTrajectory?: (info: TrajectoryInfo) => void;
  /** Key that triggers `onFocusTrajectory`. Default: `' '` (Space). */
  focusKey?: string;
};

export type MeasureTool = {
  readonly object3D: THREE.Group;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
  /**
   * Cube-to-cube measurement: two clicks lock A then B, a third resets to a new A.
   * Switching mode from a previous star measurement clears the in-flight selection.
   */
  pickCube(galaxy: GalaxyData, cube: Cube): void;
  /**
   * Star measurement entry point. Routed by `setStarMode`:
   * - **'direct'** — locks the reference star A; the B endpoint follows the hover
   *   (`setHoveredStar`), so sweeping the cursor reads distances live.
   * - **'path'**   — first click locks A, second click locks B and triggers a
   *   pathfinding search; a third click re-locks A to start a new route.
   */
  pickStar(galaxy: GalaxyData, starIndex: number): void;
  /**
   * Drives the dynamic B endpoint in star-direct mode. Pass `null` to hide the
   * live segment (pointer leaves a star, closeup exits, …). No-op outside the
   * 'direct' star mode.
   */
  setHoveredStar(galaxy: GalaxyData, starIndex: number | null): void;
  /**
   * Selects how `pickStar` behaves. Changing the sub-mode mid-measurement
   * clears any in-flight star/path selection so the user sees an empty slate.
   */
  setStarMode(starMode: StarMeasureMode): void;
  starMode(): StarMeasureMode;
  /**
   * Updates the pathfinding range (in light-years for UI clarity — converted
   * internally). If a full A→B path is already on screen, it is re-computed
   * with the new range so the slider feels live.
   */
  setPathRangeLightYears(galaxy: GalaxyData, lightYears: number): void;
  pathRangeLightYears(): number;
  /**
   * Snapshot of the current measurement, or `null` when nothing complete is on
   * screen (only A locked, hovered B masked, tool disabled, etc.). Recomputed
   * each call — including `findStarPath` in path mode — so callers can pull
   * fresh info on demand (HUD render, action handler, persistence layer).
   */
  currentTrajectory(galaxy: GalaxyData): TrajectoryInfo | null;
  /**
   * Per-frame hook from the render loop. Reorients the star-mode rings towards
   * the camera (so the billboard stays facing the viewer) and propagates time.
   */
  update(camera: THREE.Camera, time: number): void;
  clear(): void;
  setResolution(width: number, height: number): void;
  dispose(): void;
};

type Anchor = { id: string; center: THREE.Vector3; starIndex: number | null };

/**
 * Two-endpoint distance tool. In orbit it measures cube centres (lock A → lock B
 * → reset); in close-up it measures star positions in one of two sub-modes:
 *   - 'direct' — straight line A → B, B follows hover.
 *   - 'path'   — multi-stop route via `findStarPath`, two-click selection.
 *
 * Mixing modes is ambiguous, so a sub-mode switch or a cube/star transition
 * clears the in-flight selection. Distances are reported in light-years via
 * `worldUnitsToLightYears`.
 *
 * Parented to `galaxyScene.object3D` by the caller so the visuals inherit the
 * galaxy's idle rotation; `clear()` is called on every regen.
 */
export function createMeasureTool(opts: MeasureToolOptions = {}): MeasureTool {
  const onPathComputed = opts.onPathComputed;
  const onPathCleared = opts.onPathCleared;
  const isStarMeasurable = opts.isStarMeasurable;
  const onFocusTrajectory = opts.onFocusTrajectory;
  const focusKey = opts.focusKey ?? ' ';
  // Tracks whether a successful path is currently displayed — drives onPathCleared.
  let pathIsLive = false;
  // Captured on every pick/hover so the focus-key handler can compute the
  // trajectory without the caller having to pass a galaxy through a window event.
  let lastGalaxy: GalaxyData | null = null;
  const object3D = new THREE.Group();
  object3D.name = 'measureTool';
  object3D.visible = false;

  const markerA = createMarker();
  const markerB = createMarker();
  object3D.add(markerA.group, markerB.group);

  // Static dashed segment — straight A→B for 'cube' and 'direct star' modes,
  // and as a fallback "out of range" indicator in 'path' mode.
  const segment: DashedPath = createDashedPath({ color: COLOR });
  object3D.add(segment.object3D);

  // Multi-stop polyline — only used in 'path' mode.
  const path: MeasurePath = createMeasurePath({ color: COLOR });
  object3D.add(path.object3D);

  const labelEl = document.createElement('div');
  labelEl.className = 'measure-label';
  labelEl.textContent = '—';
  const label = new CSS2DObject(labelEl);
  label.visible = false;
  object3D.add(label);

  let enabled = false;
  let mode: MeasureMode | null = null;
  let starModeValue: StarMeasureMode = 'direct';
  let pathRangeLy = DEFAULT_MAX_JUMP_LY;
  let anchorA: Anchor | null = null;
  let anchorB: Anchor | null = null;       // Locked endpoint (cube + path modes).
  let hoveredAnchor: Anchor | null = null; // Dynamic endpoint (star-direct only).

  // ── Rendering primitives ──────────────────────────────────────────────────

  function hideAll(): void {
    markerA.hide();
    markerB.hide();
    segment.hide();
    path.hide();
    label.visible = false;
  }

  function hideEndpoints(): void {
    markerB.hide();
    segment.hide();
    path.hide();
    label.visible = false;
  }

  function showMarker(marker: Marker, anchor: Anchor, currentMode: MeasureMode): void {
    marker.show(anchor.center, currentMode);
  }

  function drawSegment(
    a: THREE.Vector3,
    b: THREE.Vector3,
    cubeSize: number,
    color: number = COLOR,
    suffix: string = '',
  ): void {
    segment.setEndpoints(a, b);
    segment.material.color.setHex(color);
    segment.show();
    path.hide();
    label.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
    const ly = Math.round(worldUnitsToLightYears(cubeSize, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z)));
    labelEl.textContent = `${ly.toLocaleString('fr-FR')} al${suffix}`;
    labelEl.classList.toggle('measure-label--warning', color !== COLOR);
    label.visible = true;
  }

  function drawPath(galaxy: GalaxyData, result: StarPath): void {
    const { positions } = galaxy.data;
    const stops = result.stars.map(i => new THREE.Vector3(
      positions[i * 3],
      positions[i * 3 + 1],
      positions[i * 3 + 2],
    ));
    path.setStops(stops);
    path.show();
    segment.hide();
    // Label sits at the midpoint of the route's bounding segment (A↔B straight
    // line, not the polyline's middle) — keeps placement stable as hops change.
    const a = stops[0];
    const b = stops[stops.length - 1];
    label.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
    const totalLy = Math.round(worldUnitsToLightYears(galaxy.opts.cubeSize, result.totalDistance));
    const hops = result.stars.length - 1;
    labelEl.textContent = `${totalLy.toLocaleString('fr-FR')} al · ${hops} saut${hops > 1 ? 's' : ''}`;
    labelEl.classList.remove('measure-label--warning');
    label.visible = true;
  }

  /** B endpoint actually used for rendering: locked (cube/path) or hovered (star-direct). */
  function effectiveB(): Anchor | null {
    return anchorB ?? (mode === 'star' ? hoveredAnchor : null);
  }

  function render(galaxy: GalaxyData): void {
    if (anchorA === null || mode === null) { hideAll(); return; }
    showMarker(markerA, anchorA, mode);

    const b = effectiveB();
    if (b === null) { hideEndpoints(); return; }

    // In 'path' mode the markers act like 'cube' (locked beads at both ends);
    // in 'star-direct' the close-up's own hover ring already marks B.
    if (mode === 'cube' || mode === 'path') showMarker(markerB, b, mode);
    else markerB.hide();

    if (mode === 'path') {
      renderPath(galaxy, anchorA, b);
    } else {
      drawSegment(anchorA.center, b.center, galaxy.opts.cubeSize);
    }
  }

  function renderPath(galaxy: GalaxyData, a: Anchor, b: Anchor): void {
    if (a.starIndex === null || b.starIndex === null) {
      // Path mode is star-only — should never happen, but stay defensive.
      drawSegment(a.center, b.center, galaxy.opts.cubeSize);
      emitPathClearedIfLive();
      return;
    }
    const maxJumpWorld = pathRangeLy / lightYearsPerUnit(galaxy.opts.cubeSize);
    const result = findStarPath(galaxy, a.starIndex, b.starIndex, {
      maxJumpDistance: maxJumpWorld,
      isStarAllowed: isStarMeasurable,
    });
    if (result === null) {
      // Fall back to a red straight line so the user sees what they asked.
      drawSegment(a.center, b.center, galaxy.opts.cubeSize, COLOR_UNREACHABLE, ' · hors de portée');
      emitPathClearedIfLive();
      return;
    }
    drawPath(galaxy, result);
    pathIsLive = true;
    if (onPathComputed) {
      const cubes = cubesAlongPath(galaxy, result.stars);
      if (cubes.length > 0) onPathComputed(cubes);
    }
  }

  function emitPathClearedIfLive(): void {
    if (!pathIsLive) return;
    pathIsLive = false;
    onPathCleared?.();
  }

  function switchMode(next: MeasureMode): void {
    if (mode !== null && mode !== next) clear();
    mode = next;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function pickCube(galaxy: GalaxyData, cube: Cube): void {
    if (!enabled) return;
    lastGalaxy = galaxy;
    switchMode('cube');
    const anchor = cubeAnchor(galaxy, cube);
    if (anchorA === null) {
      anchorA = anchor;
    } else if (anchorB === null) {
      if (anchor.id === anchorA.id) return;
      anchorB = anchor;
    } else {
      anchorA = anchor;
      anchorB = null;
    }
    render(galaxy);
  }

  function pickStar(galaxy: GalaxyData, starIndex: number): void {
    if (!enabled) return;
    // Stars filtered out (e.g. fog-hidden cube) cannot be locked as an anchor.
    if (isStarMeasurable && !isStarMeasurable(starIndex)) return;
    lastGalaxy = galaxy;
    if (starModeValue === 'direct') {
      switchMode('star');
      const anchor = starAnchor(galaxy, starIndex);
      if (anchorA?.id === anchor.id) return;
      anchorA = anchor;
      anchorB = null;
      // Hover may still be over the same target — let updateCloseupHover refresh next frame.
      hoveredAnchor = null;
      render(galaxy);
      return;
    }
    // 'path' sub-mode — two clicks lock the route, a third restarts it.
    switchMode('path');
    const anchor = starAnchor(galaxy, starIndex);
    if (anchorA === null) {
      anchorA = anchor;
    } else if (anchorB === null) {
      if (anchor.id === anchorA.id) return;
      anchorB = anchor;
    } else {
      anchorA = anchor;
      anchorB = null;
      // 3rd click — the previous path is gone, even if we haven't rendered the new one yet.
      emitPathClearedIfLive();
    }
    render(galaxy);
  }

  function setHoveredStar(galaxy: GalaxyData, starIndex: number | null): void {
    if (!enabled || mode !== 'star') return;
    lastGalaxy = galaxy;
    // Refuse hover on a filtered star — the live A↔hover segment stays hidden.
    if (starIndex !== null && isStarMeasurable && !isStarMeasurable(starIndex)) {
      if (hoveredAnchor === null) return;
      hoveredAnchor = null;
      render(galaxy);
      return;
    }
    const nextId = starIndex === null ? null : `star:${starIndex}`;
    // Hovering A itself yields a degenerate segment — hide it.
    const hidden = nextId === null || nextId === anchorA?.id;
    const currentId = hoveredAnchor?.id ?? null;
    if (hidden) {
      if (currentId === null) return;
      hoveredAnchor = null;
    } else {
      if (currentId === nextId) return;
      hoveredAnchor = starAnchor(galaxy, starIndex as number);
    }
    render(galaxy);
  }

  function setStarMode(next: StarMeasureMode): void {
    if (starModeValue === next) return;
    starModeValue = next;
    // An in-flight star measurement uses the previous sub-mode — wiping it
    // avoids a confusing visual when the user switches mid-selection.
    if (mode === 'star' || mode === 'path') clear();
  }

  function setPathRangeLightYears(galaxy: GalaxyData, lightYears: number): void {
    if (!(lightYears > 0)) return;
    pathRangeLy = lightYears;
    // Live re-compute so the slider feels reactive when a route is on screen.
    if (mode === 'path' && anchorA !== null && anchorB !== null) {
      render(galaxy);
    }
  }

  function setEnabled(next: boolean): void {
    enabled = next;
    object3D.visible = next;
    if (!next) clear();
  }

  function clear(): void {
    mode = null;
    anchorA = null;
    anchorB = null;
    hoveredAnchor = null;
    lastGalaxy = null;
    hideAll();
    // Anchor centres live in the parent's local frame — keep the tool's own
    // transform at identity so a `scene.attach()` survival hop (regen) doesn't
    // leave a stale rotation baked in after re-parenting.
    object3D.position.set(0, 0, 0);
    object3D.rotation.set(0, 0, 0);
    object3D.scale.set(1, 1, 1);
    emitPathClearedIfLive();
  }

  function setResolution(width: number, height: number): void {
    segment.setResolution(width, height);
    path.setResolution(width, height);
  }

  function update(camera: THREE.Camera, time: number): void {
    markerA.update(camera, time);
    markerB.update(camera, time);
    path.update(camera, time);
  }

  function currentTrajectory(galaxy: GalaxyData): TrajectoryInfo | null {
    if (anchorA === null || mode === null) return null;
    const b = effectiveB();
    if (b === null) return null;

    if (mode === 'path' && anchorA.starIndex !== null && b.starIndex !== null) {
      const maxJumpWorld = pathRangeLy / lightYearsPerUnit(galaxy.opts.cubeSize);
      const result = findStarPath(galaxy, anchorA.starIndex, b.starIndex, {
        maxJumpDistance: maxJumpWorld,
        isStarAllowed: isStarMeasurable,
      });
      if (result !== null) {
        return {
          cubes: cubesAlongPath(galaxy, result.stars),
          distance: result.totalDistance,
          hops: result.stars.length - 1,
          stars: result.stars,
          longestJump: result.longestJump,
        };
      }
      // Out-of-range path → fall through to the straight A↔B framing.
    }
    const distance = anchorA.center.distanceTo(b.center);
    return {
      cubes: cubesAtPositions(galaxy, [anchorA.center, b.center]),
      distance,
      hops: 1,
      stars: [],
      longestJump: distance,
    };
  }

  // Focus-key handler — owned by the tool so callers don't have to wire one.
  // The key is no-op when the tool is disabled, when no trajectory is on screen,
  // when no galaxy has been seen yet, or when a form control has focus.
  function onKeyDown(e: KeyboardEvent): void {
    if (!onFocusTrajectory || e.key !== focusKey) return;
    if (!enabled || !lastGalaxy) return;
    if (isFormElementFocused(e.target)) return;
    const info = currentTrajectory(lastGalaxy);
    if (info === null) return;
    e.preventDefault();
    onFocusTrajectory(info);
  }
  if (onFocusTrajectory && typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeyDown);
  }

  function dispose(): void {
    if (labelEl.parentNode) labelEl.parentNode.removeChild(labelEl);
    markerA.dispose();
    markerB.dispose();
    segment.dispose();
    path.dispose();
    if (onFocusTrajectory && typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeyDown);
    }
  }

  return {
    object3D,
    setEnabled,
    isEnabled: () => enabled,
    pickCube,
    pickStar,
    setHoveredStar,
    setStarMode,
    starMode: () => starModeValue,
    setPathRangeLightYears,
    pathRangeLightYears: () => pathRangeLy,
    currentTrajectory,
    update,
    clear,
    setResolution,
    dispose,
  };
}

/** True when keystrokes belong to a form control (checkbox, slider…) and shouldn't be hijacked. */
function isFormElementFocused(target: EventTarget | null): boolean {
  const tag = (target as HTMLElement | null)?.tagName;
  return tag === 'INPUT' || tag === 'BUTTON' || tag === 'SELECT' || tag === 'TEXTAREA';
}

// ── Pure helpers ────────────────────────────────────────────────────────────

function cubeAnchor(galaxy: GalaxyData, cube: Cube): Anchor {
  const c = galaxy.grid.cubeToWorldCenter(cube.i, cube.j, cube.k);
  return {
    id: `cube:${cube.i},${cube.j},${cube.k}`,
    center: new THREE.Vector3(c.x, c.y, c.z),
    starIndex: null,
  };
}

/**
 * Cubes touched by `positions`, deduplicated, preserving first-seen order.
 * Each returned cube is the canonical one already in `galaxy.grid` — callers
 * can pass the array straight to `Closeup.enter` / `Closeup.setTrajectoryCubes`.
 *
 * Positions that fall on empty grid cells are skipped silently.
 */
export function cubesAtPositions(
  galaxy: GalaxyData,
  positions: readonly { x: number; y: number; z: number }[],
): Cube[] {
  const { grid } = galaxy;
  const seen = new Map<string, Cube>();
  for (const p of positions) {
    const { i, j, k } = grid.worldToCube(p.x, p.y, p.z);
    const key = cubeKey(i, j, k);
    if (seen.has(key)) continue;
    const cube = grid.get(i, j, k);
    if (cube) seen.set(key, cube);
  }
  return Array.from(seen.values());
}

/** Cubes traversed by the chain of stars, deduplicated in route order. */
function cubesAlongPath(galaxy: GalaxyData, stars: readonly number[]): Cube[] {
  const { positions } = galaxy.data;
  const points = stars.map((idx) => ({
    x: positions[idx * 3],
    y: positions[idx * 3 + 1],
    z: positions[idx * 3 + 2],
  }));
  return cubesAtPositions(galaxy, points);
}

function starAnchor(galaxy: GalaxyData, starIndex: number): Anchor {
  const { positions } = galaxy.data;
  return {
    id: `star:${starIndex}`,
    center: new THREE.Vector3(
      positions[starIndex * 3 + 0],
      positions[starIndex * 3 + 1],
      positions[starIndex * 3 + 2],
    ),
    starIndex,
  };
}

// ── Markers ─────────────────────────────────────────────────────────────────

type Marker = {
  /** Group containing both primitives — add this to the scene graph. */
  group: THREE.Group;
  /** Position + reveal the right primitive for the current mode. */
  show(at: THREE.Vector3, currentMode: MeasureMode): void;
  /** Hide both primitives. */
  hide(): void;
  /** Per-frame hook: recomputes ring scale (constant on-screen size) and faces the camera. */
  update(camera: THREE.Camera, time: number): void;
  dispose(): void;
};

/**
 * A marker has two visual modalities under the same anchor:
 * - **cube mode** — solid additive bead at the cube centre (visible from orbit
 *   distances where a ring would be unreadable).
 * - **star/path modes** — soft thin selection ring (shared shader with the
 *   close-up hover) sized to the locked star's `aSize` so it sits just outside
 *   the sprite.
 *
 * Switching mode hides one and shows the other; both share the same parent
 * group so positioning/transforms stay coherent.
 */
function createMarker(): Marker {
  const group = new THREE.Group();

  const sphereGeometry = new THREE.SphereGeometry(MARKER_BASE_RADIUS, 16, 12);
  const sphereMaterial = new THREE.MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: CUBE_MARKER_OPACITY,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
  sphereMesh.renderOrder = 1099;
  sphereMesh.visible = false;
  group.add(sphereMesh);

  const ring: SelectionRing = createSelectionRing({ color: COLOR, pulse: false });
  ring.object.renderOrder = 1099;
  group.add(ring.object);

  function show(at: THREE.Vector3, currentMode: MeasureMode): void {
    if (currentMode === 'cube') {
      sphereMesh.position.copy(at);
      sphereMesh.visible = true;
      ring.hide();
    } else {
      ring.setPosition(at.x, at.y, at.z);
      // Scale is set per-frame in update() so the apparent size stays constant.
      ring.show();
      sphereMesh.visible = false;
    }
  }

  function hide(): void {
    sphereMesh.visible = false;
    ring.hide();
  }

  function update(camera: THREE.Camera, time: number): void {
    if (!ring.object.visible) return;
    const distance = ring.object.position.distanceTo(camera.position);
    ring.setSize(STAR_RING_SCREEN_BASE * distance);
    ring.update(camera, time);
  }

  function dispose(): void {
    sphereGeometry.dispose();
    sphereMaterial.dispose();
    (ring.object.geometry as THREE.BufferGeometry).dispose();
    (ring.object.material as THREE.Material).dispose();
  }

  return { group, show, hide, update, dispose };
}
