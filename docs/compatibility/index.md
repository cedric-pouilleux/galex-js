# Compatibilité cross-engine

## Le contrat

> Pour un même couple `(seed, opts)`, `generateGalaxy` produit des `Float32Array` **byte-à-byte identiques** sur tout moteur JavaScript ES2017+.

Ce contrat est la fondation du modèle client/serveur :

- Le serveur ne stocke **que** `seed + opts` pour la structure statique du monde.
- Le client régénère localement la galaxie depuis ces deux valeurs.
- Le serveur valide les actions du joueur en redérivant la même structure.
- Aucun index de cubes ni positions n'a besoin de transiter sur le réseau.

Si le contrat se brise (un seul appel à `Math.sin` natif dans la chaîne déterministe), le serveur et le client ne s'accordent plus sur ce qu'est *l'étoile #4217*, et la validation des opérations rejette des actions légitimes.

## Pourquoi c'est non-trivial

ECMAScript ne mandate la précision IEEE 754 *correctement arrondie* que pour un sous-ensemble d'opérations :

| Opération | Spec | Bit-stable ? |
|---|---|---|
| `+`, `-`, `*`, `/` | IEEE 754 round-to-nearest | ✅ |
| `Math.sqrt` | IEEE depuis ES2017 | ✅ |
| `Math.floor`, `Math.round`, `Math.fround` | spec exact | ✅ |
| `Math.imul`, `\| 0`, `>>> 0`, bitops | spec exact | ✅ |
| `Math.PI`, `Math.LN2`, `Math.SQRT2`, etc. | constantes spec | ✅ |
| `Math.sin`, `Math.cos`, `Math.tan` | *implementation-defined* | ❌ |
| `Math.exp`, `Math.log`, `Math.pow` | *implementation-defined* | ❌ |
| `Math.atan2`, `Math.asin`, `Math.acos` | *implementation-defined* | ❌ |
| `Math.hypot` | *implementation-defined* | ❌ |

Les fonctions transcendantes utilisent chacune leur propre bibliothèque (fdlibm, cephes, libm…) selon le moteur. Elles diffèrent typiquement de **1 à 2 ulp** entre V8, SpiderMonkey et JavaScriptCore.

Sur une seule étoile, 1 ulp est invisible (10⁻¹⁶). Mais le pipeline de génération fait du **rejection sampling** sur des comparaisons de flottants — donc une dérive d'1 ulp peut basculer une étoile dans un cube voisin, ou faire diverger le **flux d'appels au RNG** (l'étoile #4217 d'un moteur devient la #4218 d'un autre).

## La règle d'or

Tout fichier qui contribue à la chaîne `seed → buffers` n'utilise **jamais** :

```text
Math.sin   Math.cos   Math.tan
Math.exp   Math.log   Math.pow
Math.atan  Math.atan2 Math.asin  Math.acos
Math.hypot
```

À la place, on passe par [det-math](./deterministic-math) qui réimplémente ces fonctions avec uniquement les ops bit-stables.

Le code de **rendu** (Three.js, shaders) est libre d'utiliser `Math.*` natif — une dérive d'1 ulp est invisible à l'écran.

## Frontière dans la lib

```
core/                       # zone bit-stable, runtime-agnostic, importable côté serveur
├── galaxy-data.ts          # createGalaxyData : surface publique côté données
├── det-math.ts             # remplacements bit-stables des transcendantes
├── visibility.ts           # helper pur de visibilité (focals → buffer)
├── Random.ts               # PRNG mulberry32
├── StarColor.ts            # blackbodyRGB / sampleTemperature
├── StarGenerator.ts        # generateGalaxy
├── CubeGrid.ts             # indexation spatiale + raycast
└── *.test.ts

view/                       # rendu Three.js
├── GalaxyScene.ts          # createGalaxyScene : surface publique côté rendu
├── CubeMarker.ts, GridHelper.ts, StarNames.ts
├── closeup/                # primitives close-up (Buffers, HoverRing, StarShader)
└── effects/                # factories par couche
```

Tout fichier dans `core/` est soumis à deux règles dures auditées par `npm run test:determinism` :

1. Aucun appel à `Math.{sin,cos,tan,asin,acos,atan,atan2,exp,expm1,log,log2,log10,log1p,pow,hypot,cbrt}` — passer par [det-math](./deterministic-math).
2. Aucun `import … from 'three'` — `core/` doit pouvoir s'importer dans Node sans WebGL.

Voir [Côté serveur](./server-side) pour la consommation de `GalaxyData` en backend.

## État de la vérification

Validé sur les trois moteurs majeurs via Playwright (voir [Vérification](./verification)) :

| Engine | Runtime |
|---|---|
| V8 | Node 24, Chromium |
| SpiderMonkey | Firefox |
| JavaScriptCore | WebKit (engine de Safari) |

Aucune dérive observée pour `seed=42` sur la config par défaut.
