# Consignes pour Claude

Lire [ARCHITECTURE.md](ARCHITECTURE.md) avant toute modification.

- Site statique Astro, entièrement en français.
- Liens internes : toujours via `url()` de `src/lib/url.ts`.
- Aucune ressource tierce (police, script, CDN) sans l'ajouter à la CSP dans
  `astro.config.mjs` et le justifier dans ARCHITECTURE.md.
- Photos : toujours passer par `npm run photos` (suppression des métadonnées GPS)
  avant de les ajouter dans `src/assets/photos/`.
- Actualités : un dossier par article dans `src/content/actualites/` (`index.md` + photo),
  voir `docs/publier-une-actualite.md` (à tenir à jour si le schéma change).
- Carte : ne pas modifier `public/data/carte/*.json` à la main (générés par `scripts/data/`).
- Aucun secret dans le dépôt (il est public).
- Avant de pousser : `npm run check`, `npm run check:images` et `npm run build` sans erreur.
