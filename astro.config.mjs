// @ts-check
import { defineConfig, envField } from 'astro/config';

// L'adresse du site est fournie par l'environnement de construction :
//  - GitHub Pages (prévisualisation) : renseignée automatiquement par le workflow ;
//  - hébergement définitif : SITE_URL=https://www.exemple.fr et BASE_PATH=/
// En local, le site est servi à la racine.
const site = process.env.SITE_URL || 'http://localhost:4321';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory' },
  // Pas de coloration de code dans les actualités : Shiki utilise des styles
  // en ligne incompatibles avec la CSP.
  markdown: { syntaxHighlight: false },
  env: {
    schema: {
      // Passer à true le jour de la mise en ligne définitive : tant que c'est
      // false, le site demande aux moteurs de recherche de ne pas l'indexer.
      SITE_INDEXABLE: envField.boolean({ context: 'server', access: 'public', default: false }),
    },
  },
  security: {
    // Politique de sécurité du contenu (CSP) : Astro calcule lui-même les
    // empreintes des scripts et styles, et les ajoute à script-src / style-src.
    // Toute ressource externe (carte, API…) devra être ajoutée explicitement ici.
    csp: {
      directives: [
        "default-src 'self'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "form-action 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        'upgrade-insecure-requests',
      ],
    },
  },
});
