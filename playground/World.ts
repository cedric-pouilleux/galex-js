import * as THREE from 'three';
import type { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import type { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import type { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { createGalaxyData } from '../core/GalaxyData.js';
import type { GalaxyData, GalaxyDataOptions } from '../core/GalaxyData.js';
import { createGalaxyScene } from '../view/GalaxyScene.js';
import type { GalaxyScene } from '../view/GalaxyScene.js';
import { createCubeWireframe, createOccupiedGridLines } from '../view/GridHelper.js';
import { createCubeMarker } from '../view/CubeMarker.js';
import { disposeObject3DTree } from '../view/Dispose.js';
import type { CubeMarker } from '../view/CubeMarker.js';
import { makeCubeLabel } from './Labels.js';
import { createCloseup } from './Closeup.js';
import type { Closeup } from './Closeup.js';
import { pickPlayerStar, PLAYER_COLOR_HEX } from './Player.js';
import type { Player } from './Player.js';
import type { Hud } from './HUD.js';

export type GalaxyWorld = {
  galaxyData: GalaxyData;
  galaxyScene: GalaxyScene;
  player: Player;
  playerMarker: CubeMarker;
  hoverWire: LineSegments2;
  hoverLabel: CSS2DObject;
  occupiedLines: THREE.LineSegments;
  closeup: Closeup;
};

export type GalaxyWorldOptions = GalaxyDataOptions & { gasDensity?: number };

export type GalaxyWorldDeps = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  hud: Hud;
  seedEl: HTMLElement;
};

/**
 * Builds the full set of mutable objects bound to a single galaxy: scene-graph
 * nodes (galaxy layers, hover wire, occupied grid, player marker), the player
 * spawn, and the close-up orchestrator.
 *
 * Lives in the playground because it composes the lib's neutral primitives
 * with a sandbox notion of "player marker on the home cube" — exactly the
 * kind of glue an MMO 4X consumer would write differently.
 */
export function createGalaxyWorld(opts: GalaxyWorldOptions, deps: GalaxyWorldDeps): GalaxyWorld {
  const { scene, camera, controls, hud, seedEl } = deps;
  const { gasDensity, ...dataOpts } = opts;

  const galaxyData = createGalaxyData(dataOpts);
  const galaxyScene = createGalaxyScene(galaxyData, { gasDensity });
  scene.add(galaxyScene.object3D);

  const hoverWire = createCubeWireframe(galaxyData.opts.cubeSize, 0xffffff, { linewidth: 3 });
  hoverWire.visible = false;
  galaxyScene.object3D.add(hoverWire);

  const occupiedLines = createOccupiedGridLines(galaxyData.grid);
  galaxyScene.object3D.add(occupiedLines);

  const hoverLabel = makeCubeLabel('hover');
  hoverLabel.visible = false;
  hoverWire.add(hoverLabel);

  const player = pickPlayerStar(galaxyData);
  const playerMarker = createCubeMarker(galaxyData.opts.cubeSize, { color: PLAYER_COLOR_HEX });
  const pc = galaxyData.grid.cubeToWorldCenter(player.cube.i, player.cube.j, player.cube.k);
  playerMarker.object3D.position.set(pc.x, pc.y, pc.z);
  galaxyScene.object3D.add(playerMarker.object3D);

  const closeup = createCloseup({ camera, controls, galaxyData, galaxyScene });

  hud.setStatic({
    stars: galaxyData.data.count,
    cubes: galaxyData.grid.size(),
    populated: galaxyData.grid.occupiedCount(),
  });
  hud.setPlayer({ name: player.name, cube: player.cube });
  seedEl.textContent = String(galaxyData.seed);

  return { galaxyData, galaxyScene, player, playerMarker, hoverWire, hoverLabel, occupiedLines, closeup };
}

/**
 * Releases every GPU resource owned by the world and detaches its root from
 * the scene. The caller is responsible for not using the world bag afterwards.
 */
export function disposeGalaxyWorld(world: GalaxyWorld, scene: THREE.Scene): void {
  const { galaxyScene, hoverLabel, occupiedLines, hoverWire, playerMarker, closeup } = world;

  if (closeup.isActive()) closeup.exit({ instant: true });

  if (hoverLabel.element && hoverLabel.element.parentNode) {
    hoverLabel.element.parentNode.removeChild(hoverLabel.element);
  }

  occupiedLines.geometry.dispose();
  (occupiedLines.material as THREE.Material).dispose();

  hoverWire.geometry.dispose();
  (hoverWire.material as THREE.Material).dispose();

  disposeObject3DTree(playerMarker.object3D);

  scene.remove(galaxyScene.object3D);
  galaxyScene.dispose();
}
