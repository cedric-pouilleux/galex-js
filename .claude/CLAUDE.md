# Projet context

Générateur procédurale d'un plateau de jeu galaxique déterministe

---

# Langue

Toujours répondre en **français**. Noms de fichiers, types et extraits de code en anglais.

---

# Technical rules

- Never edit source code without permissions
- Always add JSDOC
- Always add composable or method TU
- Typecheck and TU of edited files at the end of work
- Pas de nommage _ devant une private, les privates sont les éléments qu'on expose pas.
- Faire un effort sur le nommage des variables, des types et des fonctions
  
---

# Docs
 - Maintenir la documentation vitepress à jour
 - Expliquer les raisons des choix techniques et d'architecture
 
---

# Conventions

- TypeScript strict — toujours proposer les types avant le code
- Seed déterministe pour toute génération procédurale — ne pas introduire de `Math.random()` nu
- Nom de Fichiers js, ts et vue en PascalCase
- On préfère manipuler des fonctions / composables, plutot que des classes
- Composables testables sans montage de composant Vue
- Commentaires en anglais dans le code
- Pas de code inutilisé dans la codebase.
- On evite les commentaires à rallonges, on pense au volume du context.

---

# Paradigm

- Boyscout — clean code, refacto quand le code est complexe, inutilisé ou sent mauvais
- KISS & YAGNI