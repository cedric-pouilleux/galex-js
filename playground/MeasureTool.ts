import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { worldUnitsToLightYears } from '../core/Astronomy.js';
import type { Cube } from '../core/CubeGrid.js';
import type { GalaxyData } from '../core/GalaxyData.js';

const COLOR = 0x6cf2ff;
const MARKER_BASE_RADIUS = 0.45;

// Per-mode marker look. Star mode is a soft halo that hugs the star sprite;
// cube mode is a solid bead centred in the cube.
const LOOKS = {
  cube: { scale: 1.00, opacity: 0.90 },
  star: { scale: 0.55, opacity: 0.35 },
} as const;

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
  object3D.add(markerA.mesh, markerB.mesh);

  const lineGeometry = new LineGeometry();
  lineGeometry.setPositions([0, 0, 0, 0, 0, 0]);
  const lineMaterial = new LineMaterial({
    color: COLOR,
    linewidth: 2,
    transparent: true,
    opacity: 0.9,
    depthTest: false,
  });
  lineMaterial.resolution.set(window.innerWidth, window.innerHeight);
  const line = new Line2(lineGeometry, lineMaterial);
  line.computeLineDistances();
  line.renderOrder = 1100;
  line.visible = false;
  object3D.add(line);

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
    markerA.mesh.visible = false;
    markerB.mesh.visible = false;
    line.visible = false;
    label.visible = false;
  }

  function hideSegment(): void {
    markerB.mesh.visible = false;
    line.visible = false;
    label.visible = false;
  }

  function showMarker(marker: Marker, at: THREE.Vector3): void {
    marker.mesh.position.copy(at);
    marker.mesh.visible = true;
  }

  function drawSegment(a: THREE.Vector3, b: THREE.Vector3, cubeSize: number): void {
    lineGeometry.setPositions([a.x, a.y, a.z, b.x, b.y, b.z]);
    line.computeLineDistances();
    line.visible = true;
    label.position.set((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
    labelEl.textContent = formatDistance(cubeSize, Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    label.visible = true;
  }

  function applyMarkerLook(): void {
    if (mode === null) return;
    const look = LOOKS[mode];
    for (const m of [markerA, markerB]) {
      m.mesh.scale.setScalar(look.scale);
      m.setOpacity(look.opacity);
    }
  }

  /** B endpoint actually used for rendering: locked (cube) or hovered (star). */
  function effectiveB(): Anchor | null {
    return anchorB ?? (mode === 'star' ? hoveredAnchor : null);
  }

  function render(galaxy: GalaxyData): void {
    if (anchorA === null) { hideAll(); return; }
    showMarker(markerA, anchorA.center);

    const b = effectiveB();
    if (b === null) { hideSegment(); return; }

    // Star mode relies on the close-up's own hover ring to mark B — adding a
    // second halo here would just clutter the view.
    if (mode === 'cube') showMarker(markerB, b.center);
    else markerB.mesh.visible = false;

    drawSegment(anchorA.center, b.center, galaxy.opts.cubeSize);
  }

  function switchMode(next: MeasureMode): void {
    if (mode !== null && mode !== next) clear();
    mode = next;
    applyMarkerLook();
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
    lineGeometry.dispose();
    lineMaterial.dispose();
  }

  function setResolution(width: number, height: number): void {
    lineMaterial.resolution.set(width, height);
  }

  return {
    object3D,
    setEnabled,
    isEnabled: () => enabled,
    pickCube,
    pickStar,
    setHoveredStar,
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
  mesh: THREE.Mesh;
  setOpacity(opacity: number): void;
  dispose(): void;
};

function createMarker(): Marker {
  const geometry = new THREE.SphereGeometry(MARKER_BASE_RADIUS, 16, 12);
  const material = new THREE.MeshBasicMaterial({
    color: COLOR,
    transparent: true,
    opacity: LOOKS.cube.opacity,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.renderOrder = 1099;
  mesh.visible = false;
  return {
    mesh,
    setOpacity: (opacity) => { material.opacity = opacity; },
    dispose: () => { geometry.dispose(); material.dispose(); },
  };
}
