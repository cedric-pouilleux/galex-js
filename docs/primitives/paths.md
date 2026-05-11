# Paths — chemins entre deux points

Primitives visuelles pour relier deux positions du plateau. Conçues comme **blocs de construction** : par défaut sobres (mesure de distance), customisables par options (trajectoire de flotte, route de commerce, déplacement de vaisseau).

## `createDashedPath`

Ligne pointillée `Line2` entre A et B, options d'animation côté caller, hooks d'extension pour aller plus loin.

```ts
import { createDashedPath } from 'galex-js/view/paths/DashedPath';

const path = createDashedPath({ color: 0x6cf2ff });
scene.add(path.object3D);
path.setEndpoints(planetA, planetB);
path.show();
```

### Options

| Option | Défaut | Rôle |
|---|---|---|
| `color` | — (requis) | Teinte de la ligne. |
| `linewidth` | `2` | Épaisseur en pixels écran. |
| `dashSize` / `gapSize` | `0.35` / `0.22` | Motif des tirets en unités monde. |
| `opacity` | `0.85` | Opacité de base. |
| `dashScrollSpeed` | `0` | Vitesse de défilement des tirets, unités/seconde. **Positif = flux A → B.** `0` = statique. |
| `pulseAmp` | `0` | Amplitude de respiration de l'opacité (±). `0` = statique. `0.15` = pulse subtil. |

### Usage statique — mesure de distance

Defaults inchangés : juste un trait pointillé qui dit "ceci est une mesure".

```ts
const measure = createDashedPath({ color: 0x6cf2ff });
measure.setEndpoints(a, b);
measure.show();
// Aucun update() à appeler — la ligne est immobile.
```

### Usage animé — trajectoire de vaisseau

Active les deux animations pour un look "trajet actif" :

```ts
const shipPath = createDashedPath({
  color: 0xa6f5ff,
  linewidth: 2,
  dashSize: 0.5,
  gapSize: 0.15,         // resserré → lecture "intent"
  opacity: 0.9,
  dashScrollSpeed: 1.2,  // tirets coulent A → B
  pulseAmp: 0.15,        // respiration discrète
});
scene.add(shipPath.object3D);

// Plus tard, au moment de l'ordre :
shipPath.setEndpoints(currentSystem, targetSystem);
shipPath.show();

// Dans la boucle de rendu :
function render(time: number) {
  shipPath.update(time);
  // …
}
```

## Aller plus loin — extension côté caller

La primitive est **intentionnellement minimaliste**. Pour des effets plus riches (tête de flèche, traînée de particules, halo lumineux, shader chunks custom), trois points d'extension :

### 1. `object3D` est un `THREE.Group` extensible

Ajoute tes propres meshes au group du path — ils héritent du même parent transform :

```ts
const path = createDashedPath({ color: 0xa6f5ff, dashScrollSpeed: 1.0 });

// Tête de flèche à l'arrivée
const arrowHead = new THREE.Mesh(
  new THREE.ConeGeometry(0.15, 0.3, 8),
  new THREE.MeshBasicMaterial({ color: 0xa6f5ff }),
);
path.object3D.add(arrowHead);

function setRoute(a: THREE.Vector3, b: THREE.Vector3) {
  path.setEndpoints(a, b);
  arrowHead.position.copy(b);
  arrowHead.lookAt(a); // pointe vers l'origine
}
```

### 2. `material` — uniformes custom + `onBeforeCompile`

Le `LineMaterial` sous-jacent est exposé. Tu peux :

- Pousser tes propres uniformes :

```ts
path.material.uniforms.uTime = { value: 0 };
function render(t: number) {
  path.material.uniforms.uTime.value = t;
}
```

- Injecter du GLSL via `onBeforeCompile` (chunks Three.js) :

```ts
path.material.onBeforeCompile = (shader) => {
  shader.uniforms.uHeat = { value: 0 };
  shader.fragmentShader = shader.fragmentShader.replace(
    'vec4 diffuseColor = vec4( diffuse, opacity );',
    `
      vec4 diffuseColor = vec4( diffuse, opacity );
      // boost red channel by heat
      diffuseColor.r += uHeat * 0.4;
    `,
  );
};
```

### 3. `geometry` — buffer direct (multi-segments, courbes)

Si tu veux un chemin courbe ou multi-segments plutôt qu'un A→B droit, écris directement dans la `LineGeometry` :

```ts
const points: number[] = [];
for (let i = 0; i <= 20; i++) {
  const t = i / 20;
  const curve = bezier(a, control, b, t);
  points.push(curve.x, curve.y, curve.z);
}
path.geometry.setPositions(points);
// IMPORTANT : recalculer les distances pour que les tirets restent uniformes.
(path.object3D.children[0] as Line2).computeLineDistances();
```

### 4. Composer une autre primitive en parallèle

Pour des effets totalement séparés (particules indépendantes, glow billboard), crée ta propre primitive et synchronise ses endpoints avec ceux du path :

```ts
const path = createDashedPath({ color: 0xa6f5ff, dashScrollSpeed: 1.2 });
const particles = createMyParticleStream({ color: 0xa6f5ff, count: 20 });
scene.add(path.object3D, particles.object3D);

function setRoute(a: THREE.Vector3, b: THREE.Vector3) {
  path.setEndpoints(a, b);
  particles.setEndpoints(a, b);
}

function render(time: number) {
  path.update(time);
  particles.update(time);
}
```

## Pourquoi cette primitive vit dans `view/`

Le `MeasureTool` du playground la consomme avec ses defaults statiques, mais le visuel "dashed path A→B" est suffisamment générique pour servir aussi tes propres concepts jeu (flottes, routes, ordres de mouvement). On la fournit donc en lib, paramétrée pour les deux usages.

Le caller pose les options et les hooks. **Aucun concept *fleet*, *ship* ou *route* dans la lib** — c'est toi qui mappes le visuel sur ta sémantique.
