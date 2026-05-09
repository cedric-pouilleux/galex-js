# Variations d'options

Même seed, options modifiées. Permet de voir l'effet isolé de chaque paramètre. Toutes les démos ci-dessous utilisent `seed=42` ; seul l'option mentionnée diffère entre les cellules.

Voir la [référence `createGalaxyData`](../api/galaxy-data) pour la liste complète.

## `arms` — nombre de bras spiraux

Plus le nombre de bras est élevé, plus la structure est dense en sortie de bulbe et plus le pattern sera visible à grande échelle.

<GalaxyGrid :height="240" :items="[
  { seed: 42, arms: 2, caption: 'arms=2' },
  { seed: 42, arms: 4, caption: 'arms=4' },
  { seed: 42, arms: 6, caption: 'arms=6 (défaut)' },
  { seed: 42, arms: 10, caption: 'arms=10' },
]" />

## `spin` — enroulement spiral

Multiplicateur d'angle radial. Faible = bras quasi droits, fort = enroulement serré.

<GalaxyGrid :height="240" :items="[
  { seed: 42, spin: 0.3, caption: 'spin=0.3' },
  { seed: 42, spin: 0.6, caption: 'spin=0.6' },
  { seed: 42, spin: 0.9, caption: 'spin=0.9 (défaut)' },
  { seed: 42, spin: 1.4, caption: 'spin=1.4' },
]" />

## `spread` — étalement off-arm

Quantité de bruit perpendiculaire aux bras. Faible = bras nets, fort = bras flous.

<GalaxyGrid :height="240" :items="[
  { seed: 42, spread: 0.3, caption: 'spread=0.3' },
  { seed: 42, spread: 0.6, caption: 'spread=0.6' },
  { seed: 42, spread: 0.95, caption: 'spread=0.95 (défaut)' },
  { seed: 42, spread: 1.4, caption: 'spread=1.4' },
]" />

## `fieldRatio` — population âgée hors bras

Fraction des étoiles tirées dans le champ uniforme du disque (vs collées aux bras). Augmenter pour adoucir la structure.

<GalaxyGrid :height="240" :items="[
  { seed: 42, fieldRatio: 0.0, caption: 'fieldRatio=0.0' },
  { seed: 42, fieldRatio: 0.3, caption: 'fieldRatio=0.3 (défaut)' },
  { seed: 42, fieldRatio: 0.6, caption: 'fieldRatio=0.6' },
  { seed: 42, fieldRatio: 1.0, caption: 'fieldRatio=1.0' },
]" />

## `gasDensity` — multiplicateur des couches gaz

Option **view-only** (pas dans `GalaxyData`, juste sur `GalaxyScene`). Multiplie la densité des nébuleuses, streaks, halo de bras.

<GalaxyGrid :height="240" :items="[
  { seed: 42, gasDensity: 0.0, caption: 'gasDensity=0.0' },
  { seed: 42, gasDensity: 0.5, caption: 'gasDensity=0.5' },
  { seed: 42, gasDensity: 1.0, caption: 'gasDensity=1.0 (défaut)' },
  { seed: 42, gasDensity: 1.8, caption: 'gasDensity=1.8' },
]" />

## Combinaisons

Trois presets contrastés pour donner une intuition de la palette accessible.

<GalaxyGrid :height="280" :items="[
  { seed: 42, arms: 2, spin: 1.4, spread: 0.4, gasDensity: 0.6, caption: 'serré 2-bras, peu de gaz' },
  { seed: 42, arms: 6, spin: 0.9, spread: 0.95, gasDensity: 1.0, caption: 'standard (défauts)' },
  { seed: 42, arms: 10, spin: 0.5, spread: 1.2, gasDensity: 1.6, caption: 'éparpillé, gaz dense' },
]" />
