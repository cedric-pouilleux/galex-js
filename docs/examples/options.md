# Variations d'options

<script setup>
// Gradient presets — see `temperatureGradient` section. Defined here rather than
// inline because Vue prop binding in markdown can't carry arrow functions.
const gradients = {
  edgeYoung: (r) => 4 * r,                // centre froid, bord chaud
  centreYoung: (r) => 4 * (1 - r),        // centre chaud, bord froid
  diskHot: (r) => 4 * (1 - Math.abs(2 * r - 1)), // chaud en mi-disque, froid centre+bord
  cool: () => 0,                          // tout en M/K
};
</script>

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

## `temperatureGradient` — gradient radial de population

Fonction `(r/radius) → multiplicateur` qui module le biais de température par étoile (voir [doc API](../api/galaxy-data#temperaturegradient)). Le défaut (`null`) ne change rien : ~30% des étoiles tirent dans le profil champ (M/K dominantes), ~70% dans le profil bras (plus de B/A/F). Une valeur retournée `>1` pousse vers le chaud, `<1` vers le froid, `1` reste neutre.

<GalaxyGrid :height="240" :items="[
  { seed: 42, caption: 'défaut (null)' },
  { seed: 42, temperatureGradient: gradients.edgeYoung, caption: '4·r — froid au centre, chaud au bord' },
  { seed: 42, temperatureGradient: gradients.centreYoung, caption: '4·(1−r) — chaud au centre, froid au bord' },
  { seed: 42, temperatureGradient: gradients.diskHot, caption: 'pic en mi-disque — bulbe+halo vieux' },
]" />

::: tip Pourquoi `4·r` et pas `r` ?
Le `armBias` de base est déjà ~0.85 dans les bras. Multiplier par `r ∈ [0, 0.9]` ne fait que l'écraser. On veut une plage qui traverse [0, 1] pour exhiber le contraste — d'où le facteur 4 (clampé en sortie).
:::

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
