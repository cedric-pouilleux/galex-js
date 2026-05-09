import * as THREE from 'three';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createGalaxyWorld, disposeGalaxyWorld } from './World.js';
import type { GalaxyWorld, GalaxyWorldOptions } from './World.js';
import type { GenPanel } from './GenPanel.js';
import type { Fog } from './Fog.js';
import type { PlanView } from './PlanView.js';
import type { Hud } from './HUD.js';

export type RegenerateDeps = {
  scene: THREE.Scene;
  perspectiveCamera: THREE.PerspectiveCamera;
  perspectiveControls: OrbitControls;
  orthoCamera: THREE.OrthographicCamera;
  orthoControls: OrbitControls;
  orthoCamY: number;
  hud: Hud;
  seedEl: HTMLElement;
  fog: Fog;
  planView: PlanView;
  genPanel: GenPanel;
  toggleGridEl: HTMLInputElement;
  toggleFogEl: HTMLInputElement;
  togglePlanViewEl: HTMLInputElement;
  fogRangeRowEl: HTMLElement;
  /** Reads the current world for the teardown step. */
  getCurrentWorld: () => GalaxyWorld;
  /** Replaces the host's reference to the world after a successful rebuild. */
  setCurrentWorld: (world: GalaxyWorld) => void;
};

/**
 * Builds a regen function that tears down the current world, builds a fresh
 * one with the panel's options (forcing a new seed when requested), and
 * restores any active dynamic mode (fog / plan view) afterwards.
 *
 * Reentrancy-safe: a second call while a regen is in-flight is dropped.
 */
export function createRegenerate(deps: RegenerateDeps): (arg?: { newSeed?: boolean }) => void {
  const {
    scene, perspectiveCamera, perspectiveControls, orthoCamera, orthoControls, orthoCamY,
    hud, seedEl, fog, planView, genPanel,
    toggleGridEl, toggleFogEl, togglePlanViewEl, fogRangeRowEl,
    getCurrentWorld, setCurrentWorld,
  } = deps;

  const camerasBag = {
    perspectiveCamera, perspectiveControls,
    orthoCamera, orthoControls, orthoCamY,
  };

  let inProgress = false;

  return function regenerate({ newSeed = false }: { newSeed?: boolean } = {}): void {
    if (inProgress) return;
    inProgress = true;

    const currentWorld = getCurrentWorld();
    const wasFog = fog.active;
    const wasPlanView = planView.active;

    // Exit dynamic modes before tearing down — restored after rebuild.
    if (wasPlanView) planView.set(false, currentWorld, camerasBag, fog, hud);
    if (wasFog) {
      fog.disable(currentWorld, camerasBag, toggleGridEl.checked);
      fogRangeRowEl.classList.remove('active');
    }

    const opts: GalaxyWorldOptions = genPanel.readOpts();
    opts.seed = newSeed ? null : currentWorld.galaxyData.seed;

    genPanel.setBusy(true);
    genPanel.setStatus('génération…');

    // Yield to the browser so the status text paints before the blocking work.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const t0 = performance.now();
      fog.disposeGrid(currentWorld.galaxyScene);
      disposeGalaxyWorld(currentWorld, scene);
      const fresh = createGalaxyWorld(opts, {
        scene, camera: perspectiveCamera, controls: perspectiveControls, hud, seedEl,
      });
      setCurrentWorld(fresh);
      const dt = Math.round(performance.now() - t0);

      const params = new URLSearchParams(location.search);
      params.set('seed', String(fresh.galaxyData.seed));
      history.replaceState(null, '', `${location.pathname}?${params.toString()}`);

      fresh.occupiedLines.visible = toggleGridEl.checked;
      if (wasFog) {
        toggleFogEl.checked = true;
        fog.enable(fresh, camerasBag, planView.active);
        fogRangeRowEl.classList.add('active');
      }
      if (wasPlanView) {
        togglePlanViewEl.checked = true;
        planView.set(true, fresh, camerasBag, fog, hud);
      }

      genPanel.setStatus(`${fresh.galaxyData.data.count.toLocaleString('fr-FR')} étoiles · ${dt} ms`);
      genPanel.setBusy(false);
      inProgress = false;
    }));
  };
}
