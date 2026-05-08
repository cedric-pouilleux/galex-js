import type { GalaxyDataOptions } from '../core/GalaxyData.js';

const fmtCount = (n: number | string) => Number(n).toLocaleString('fr-FR');

const FORMATTERS: Record<string, (v: number | string) => string> = {
  genCount:  (v) => fmtCount(v),
  genArms:   (v) => String(v),
  genInner:  (v) => Number(v).toFixed(1),
  genRadius: (v) => String(v),
  genSpin:   (v) => Number(v).toFixed(2),
  genSpread: (v) => Number(v).toFixed(2),
  genField:  (v) => `${v} %`,
  genGas:    (v) => Number(v).toFixed(2),
};

const SLIDER_IDS = ['genCount', 'genArms', 'genInner', 'genRadius', 'genSpin', 'genSpread', 'genField', 'genGas'] as const;

const LIVE_REGEN_DEBOUNCE_MS = 300;

export type GenOpts = GalaxyDataOptions & { gasDensity?: number };

export type GenPanelHandlers = {
  onRequestRegen: (arg: { newSeed: boolean }) => void;
};

export type GenPanel = {
  readOpts(): GenOpts;
  setStatus(text: string): void;
  setBusy(busy: boolean): void;
};

function input(id: string): HTMLInputElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLInputElement)) {
    throw new Error(`GenPanel: missing input #${id}`);
  }
  return el;
}

function button(id: string): HTMLButtonElement {
  const el = document.getElementById(id);
  if (!(el instanceof HTMLButtonElement)) {
    throw new Error(`GenPanel: missing button #${id}`);
  }
  return el;
}

function elById(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`GenPanel: missing element #${id}`);
  return el;
}

/**
 * Wires the generation slider panel to a regen handler. Slider input fires a
 * debounced live-regen with the current seed; the buttons request a regen
 * (rebuild → same seed, random → fresh seed).
 *
 * Handler-as-parameter is the canonical DOM event bridge.
 */
export function setupGenPanel({ onRequestRegen }: GenPanelHandlers): GenPanel {
  const sliders = SLIDER_IDS.map((id) => input(id));
  const fillCenterEl = input('genFillCenter');
  const statusEl = elById('genStatus');
  const rebuildBtn = button('genRebuild');
  const randomSeedBtn = button('genRandomSeed');

  let liveRegenTimer: ReturnType<typeof setTimeout> | null = null;
  function scheduleLiveRegen(): void {
    if (liveRegenTimer) clearTimeout(liveRegenTimer);
    liveRegenTimer = setTimeout(() => {
      liveRegenTimer = null;
      onRequestRegen({ newSeed: false });
    }, LIVE_REGEN_DEBOUNCE_MS);
  }

  for (const el of sliders) {
    const out = elById(el.id + 'Value');
    const fmt = FORMATTERS[el.id];
    el.addEventListener('input', () => {
      out.textContent = fmt(el.value);
      scheduleLiveRegen();
    });
    out.textContent = fmt(el.value);
  }
  fillCenterEl.addEventListener('change', scheduleLiveRegen);

  rebuildBtn.addEventListener('click', () => onRequestRegen({ newSeed: false }));
  randomSeedBtn.addEventListener('click', () => onRequestRegen({ newSeed: true }));

  function readOpts(): GenOpts {
    const [count, arms, innerRadius, radius, spin, spread, fieldPct, gasDensity] = sliders.map((el) => Number(el.value));
    return {
      count,
      arms,
      innerRadius,
      radius,
      spin,
      spread,
      fieldRatio: fieldPct / 100,
      gasDensity,
      fillCenter: fillCenterEl.checked,
      cubeSize: 2,
      minDistance: 0.25,
    };
  }

  return {
    readOpts,
    setStatus: (text: string) => { statusEl.textContent = text; },
    setBusy: (busy: boolean) => {
      rebuildBtn.disabled = busy;
      randomSeedBtn.disabled = busy;
    },
  };
}
