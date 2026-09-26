# Consignes pour Claude

Lire [ARCHITECTURE.md](ARCHITECTURE.md) avant toute modification.

- Site statique Astro, entièrement en français.
- Liens internes : toujours via `url()` de `src/lib/url.ts`.
- Aucune ressource tierce (police, script, CDN) sans l'ajouter à la CSP dans
  `astro.config.mjs` et le justifier dans ARCHITECTURE.md.
- Photos : toujours passer par `npm run photos` (suppression des métadonnées GPS)
  avant de les ajouter dans `src/assets/photos/`.
- Aucun secret dans le dépôt (il est public).
- Avant de pousser : `npm run check` et `npm run build` sans erreur.
