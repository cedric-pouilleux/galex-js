import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { worldUnitsToLightYears } from '../core/Astronomy.js';
import { createSelectionRing, type SelectionRing } from '../view/closeup/SelectionRing.js';
import { createDashedPath, type DashedPath } from '../view/paths/DashedPath.js';
import type { Cube } from '../core/CubeGrid.js';
import type { GalaxyData } from '../core/GalaxyData.js';

const COLOR = 0x6cf2ff;
const MARKER_BASE_RADIUS = 0.45;
const CUBE_MARKER_OPACITY = 0.90;
/**
 * Constant apparent ring size in star mode. Mesh scale is recomputed each
 * frame as `STAR_RING_SCREEN_BASE × distance(mesh, camera)`, so the locked
 * marker keeps the same angular size on screen regardless of camera distance.
 */
const STAR_RING_SCREEN_BASE = 0.05;

export type MeasureMode = 'cube' | 'star';

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
   * Star measurement: a click locks the reference star A. The B endpoint follows
   * the hover (`setHoveredStar`), so sweeping the cursor reads distances live.
   * A subsequent click re-locks A to the newly clicked star.
   */
  pickStar(galaxy: GalaxyData, starIndex: number): void;
  /**
   * Drives the dynamic B endpoint in star mode. Pass `null` to hide the live
   * segment (pointer leaves a star, closeup exits, …). No-op outside star mode.
   */
  setHoveredStar(galaxy: GalaxyData, starIndex: number | null): void;
  /**
   * Per-frame hook from the render loop. Reorients the star-mode rings towards
   * the camera (so the billboard stays facing the viewer) and propagates time.
   */
  update(camera: THREE.Camera, time: number): void;
  clear(): void;
  setResolution(width: number, height: number): void;
  dispose(): void;
};

type Anchor = { id: string; center: THREE.Vector3 };

/**
 * Two-endpoint distance tool. In orbit it measures cube centres (lock A → lock B
 * → reset); in close-up it measures star positions (lock A, B follows hover).
 * Mixing modes would be ambiguous, so a mode switch clears the selection.
 * Distances are reported in light-years via `worldUnitsToLightYears`.
 *
 * Parented to `galaxyScene.object3D` by the caller so the visuals inherit the
 * galaxy's idle rotation; `clear()` is called on every regen.
 */
export function createMeasureTool(): MeasureTool {
  const object3D = new THREE.Group();
  object3D.name = 'measureTool';
  object3D.visible = false;

  const markerA = createMarker();
  const markerB = createMarker();
  object3D.add(markerA.group, markerB.group);

  // Static dashed path (no animation) — communicates "measurement" without
  // competing visually with moving game elements like fleet trajectories.
  const segment: DashedPath = createDashedPath({ color: COLOR });
  object3D.add(segment.object3D);

  const labelEl = document.createElement('div');
  labelEl.className = 'measure-label';
  labelEl.textContent = '—';
  const label = new CSS2DObject(labelEl);
  label.visible = false;
  object3D.add(label);

  let enabled = false;
  let mode: MeasureMode | null = null;
  let anchorA: Anchor | null = null;
  let anchorB: Anchor | null = null;       // Locked endpoint (cube mode only).
  let hoveredAnchor: Anchor | null = null; // Dynamic endpoint (star mode only).

  // ── Rendering primitives ──────────────────────────────────────────────────

  function hideAll(): void {
    markerA.hide();
    markerB.hide();
    segment.hide();
    label.visible = false;
  }

  function hideSegment(): void {
    markerB.hide();
    segment.hide();
    label.visible = false;
  }

  function showMarker(marker: Marker, anchor: Anchor, currentMode: MeasureMode): void {
    marker.show(anchor.center, currentMode);
  }

  function drawSegment(a: THREE.Vector3, b: THREE.Vector3, cubeSize: number): void {
    segment.setEndpoints(a, b);
    segment.show();
    label.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
    labelEl.textContent = formatDistance(cubeSize, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    label.visible = true;
  }

  /** B endpoint actually used for rendering: locked (cube) or hovered (star). */
  function effectiveB(): Anchor | null {
    return anchorB ?? (mode === 'star' ? hoveredAnchor : null);
  }

  function render(galaxy: GalaxyData): void {
    if (anchorA === null || mode === null) { hideAll(); return; }
    showMarker(markerA, anchorA, mode);

    const b = effectiveB();
    if (b === null) { hideSegment(); return; }

    // Star mode relies on the close-up's own hover ring to mark B — adding a
    // second halo here would just clutter the view.
    if (mode === 'cube') showMarker(markerB, b, mode);
    else markerB.hide();

    drawSegment(anchorA.center, b.center, galaxy.opts.cubeSize);
  }

  function switchMode(next: MeasureMode): void {
    if (mode !== null && mode !== next) clear();
    mode = next;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  function pickCube(galaxy: GalaxyData, cube: Cube): void {
    if (!enabled) return;
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
    switchMode('star');
    const anchor = starAnchor(galaxy, starIndex);
    if (anchorA?.id === anchor.id) return;
    anchorA = anchor;
    anchorB = null;
    // Hover may still be over the same target — let updateCloseupHover refresh next frame.
    hoveredAnchor = null;
    render(galaxy);
  }

  function setHoveredStar(galaxy: GalaxyData, starIndex: number | null): void {
    if (!enabled || mode !== 'star') return;
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
    hideAll();
    // Anchor centres live in the parent's local frame — keep the tool's own
    // transform at identity so a `scene.attach()` survival hop (regen) doesn't
    // leave a stale rotation baked in after re-parenting.
    object3D.position.set(0, 0, 0);
    object3D.rotation.set(0, 0, 0);
    object3D.scale.set(1, 1, 1);
  }

  function dispose(): void {
    if (labelEl.parentNode) labelEl.parentNode.removeChild(labelEl);
    markerA.dispose();
    markerB.dispose();
    segment.dispose();
  }

  function setResolution(width: number, height: number): void {
    segment.setResolution(width, height);
  }

  function update(camera: THREE.Camera, time: number): void {
    markerA.update(camera, time);
    markerB.update(camera, time);
  }

  return {
    object3D,
    setEnabled,
    isEnabled: () => enabled,
    pickCube,
    pickStar,
    setHoveredStar,
    update,
    clear,
    setResolution,
    dispose,
  };
}

// ── Pure helpers ────────────────────────────────────────────────────────────

function cubeAnchor(galaxy: GalaxyData, cube: Cube): Anchor {
  const c = galaxy.grid.cubeToWorldCenter(cube.i, cube.j, cube.k);
  return {
    id: `cube:${cube.i},${cube.j},${cube.k}`,
    center: new THREE.Vector3(c.x, c.y, c.z),
  };
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
  };
}

function formatDistance(cubeSize: number, distanceWorld: number): string {
  const ly = Math.round(worldUnitsToLightYears(cubeSize, distanceWorld));
  return `${ly.toLocaleString('fr-FR')} al`;
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
 * - **star mode** — soft thin selection ring (shared shader with the close-up
 *   hover) sized to the locked star's `aSize` so it sits just outside the
 *   sprite.
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
