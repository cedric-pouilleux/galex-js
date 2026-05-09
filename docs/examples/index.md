# Galerie

Démos live (rendu Vue / TresJS dans la page) pour visualiser les galaxies générées et les modes de rendu offerts par la lib. Chaque canvas tourne en idle pour montrer la profondeur — ce ne sont pas des images, c'est le code de la lib en train de tourner dans ton navigateur.

::: tip Performance
Chaque canvas allume un contexte WebGL. Les pages limitent volontairement le nombre de démos à l'écran (4–6 max). Sur mobile, baisse la qualité globale en réduisant `window.devicePixelRatio`.
:::

## Trois axes d'exploration

- **[Variations d'options](./options)** — même seed, options modifiées (`arms`, `spread`, `fieldRatio`, `gasDensity`). Comprendre l'effet de chaque paramètre.
- **[Modes de vue](./views)** — orbite, plan, close-up. Le même `GalaxyData` rendu sous trois caméras + dim + clipping.
- **[Primitives en action](./primitives)** — cube markers, fog of war, hover ring. Les primitives lib en situation.

## Exemple — galaxie de référence

Seed `42`, options par défaut. C'est la galaxie utilisée comme référence dans la doc, bit-stable cross-engine.

<GalaxyDemo :seed="42" :height="380" caption="seed=42 — count=8000 radius=50 arms=6" />

## Plusieurs seeds, mêmes options

Variations de structure pour un même tuple `(count, radius, arms)`. Chaque cellule est un build complet du pipeline `core/` → buffers → scène.

<GalaxyGrid :height="240" :items="[
  { seed: 42, caption: 'seed=42' },
  { seed: 1337, caption: 'seed=1337' },
  { seed: 9001, caption: 'seed=9001' },
  { seed: 2024, caption: 'seed=2024' },
]" />
