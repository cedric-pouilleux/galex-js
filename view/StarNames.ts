const GREEK = [
  'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ',
  'ν', 'ξ', 'ο', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
];

/**
 * Default Bayer-style designation for a star inside a cube: the n-th star of
 * cube (i, k) is `α Cubus-i.k`, then β, γ, …, then `S25 Cubus-i.k` and so on.
 */
export function nameStarInCube(cube: { i: number; k: number }, posInCube: number): string {
  const designation = posInCube < GREEK.length
    ? GREEK[posInCube]
    : `S${posInCube + 1}`;
  return `${designation} Cubus-${cube.i}.${cube.k}`;
}
