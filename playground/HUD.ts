export type HudCubeInfo = { i: number; k: number; count: number };

export type Hud = {
  setStatic(stats: { stars: number; cubes: number; populated: number }): void;
  setPlayer(player: { name: string; cube: { i: number; k: number } }): void;
  setMode(mode: string): void;
  setHover(info: HudCubeInfo | null): void;
  setStarName(name: string | null): void;
  tick(): void;
};

function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`HUD: missing element #${id}`);
  return node;
}

export function createHud(): Hud {
  const fps           = el('fps');
  const modeLabel     = el('modeLabel');
  const starCount     = el('starCount');
  const cubeCount     = el('cubeCount');
  const cubePopulated = el('cubePopulated');
  const playerName    = el('playerName');
  const playerCube    = el('playerCube');
  const hoverCube     = el('hoverCube');
  const hoverStars    = el('hoverStars');
  const starName      = el('starName');

  let frames = 0;
  let last = performance.now();

  function setStatic({ stars, cubes, populated }: { stars: number; cubes: number; populated: number }): void {
    starCount.textContent     = stars.toLocaleString('fr-FR');
    cubeCount.textContent     = cubes.toLocaleString('fr-FR');
    cubePopulated.textContent = populated.toLocaleString('fr-FR');
  }

  function setPlayer({ name, cube }: { name: string; cube: { i: number; k: number } }): void {
    playerName.textContent = name;
    playerCube.textContent = `${cube.i} X · ${cube.k} Y`;
  }

  function setMode(mode: string): void {
    modeLabel.textContent = mode;
    modeLabel.classList.toggle('closeup', mode === 'gros plan');
  }

  function setHover(info: HudCubeInfo | null): void {
    if (!info) {
      hoverCube.textContent  = '—';
      hoverStars.textContent = '—';
      return;
    }
    hoverCube.textContent  = `${info.i} X · ${info.k} Y`;
    hoverStars.textContent = info.count.toLocaleString('fr-FR');
  }

  function setStarName(name: string | null): void {
    starName.textContent = name ?? '—';
  }

  function tick(): void {
    frames++;
    const now = performance.now();
    const dt = now - last;
    if (dt >= 500) {
      fps.textContent = String(Math.round((frames * 1000) / dt));
      frames = 0;
      last = now;
    }
  }

  return { setStatic, setPlayer, setMode, setHover, setStarName, tick };
}
