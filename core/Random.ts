export type Rng = () => number;

// mulberry32 — small/fast seeded PRNG. Same seed → identical sequence.
export function mulberry32(seed: number): Rng {
  let s = seed | 0;
  return function next(): number {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Derive a deterministic 32-bit subseed from (seed, label). Different label
// strings produce different streams from the same master seed, which makes each
// generator independent of the call ORDER of others.
export function deriveSubseed(seed: number, label: string): number {
  let h = (seed | 0) ^ 0x9e3779b9;
  for (let i = 0; i < label.length; i++) {
    h = Math.imul(h ^ label.charCodeAt(i), 0x85ebca6b);
    h = (h ^ (h >>> 13)) | 0;
  }
  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}

export function pickSeed(): number {
  return Math.floor(Math.random() * 0xffffffff);
}
