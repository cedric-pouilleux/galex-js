---
layout: home

hero:
  name: Stellex Galaxy
  tagline: Génération procédurale déterministe d'un plateau galactique, partagée serveur ↔ client
  actions:
    - theme: brand
      text: Quick start
      link: /quick-start
    - theme: alt
      text: Architecture
      link: /architecture/
    - theme: alt
      text: Primitives de plateau
      link: /primitives/
    - theme: alt
      text: Compatibilité cross-engine
      link: /compatibility/

features:
  - title: Déterministe au bit près
    details: Le même seed produit des buffers byte-à-byte identiques sur V8, SpiderMonkey et JavaScriptCore — donc Node, Chrome, Firefox, Safari.
  - title: Domaine séparé du jeu
    details: La lib offre des primitives de plateau neutres (cubes, marqueurs, visibilité, gros plan). Le jeu plug ses concepts par-dessus.
  - title: Trois cibles au choix
    details: Backend Node (pure data), vanilla Three.js (factories impératives) ou Vue + TresJS (composable réactif + composant drop-in). Un seul code source.
---
