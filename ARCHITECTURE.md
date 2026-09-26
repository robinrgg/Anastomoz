# Architecture du site Anastomoz

Ce document garde la trace des choix techniques et de leurs raisons.
Il est à mettre à jour à chaque décision structurante.

## Principes

1. **Site statique.** Des pages HTML fabriquées à l'avance : pas de base de
   données, pas de programme sur le serveur, pas d'interface d'administration
   exposée. C'est la mesure de sécurité la plus efficace et la moins coûteuse.
2. **Aucune ressource tierce au chargement.** Polices, scripts, images et icônes
   sont servis par le site lui-même (RGPD, performance, sécurité). Toute
   exception, comme les fonds de carte IGN ou l'API Hub'Eau, est déclarée
   explicitement dans la politique de sécurité (CSP).
3. **Portabilité.** Le résultat est un simple dossier `dist/` qu'on peut déposer
   chez n'importe quel hébergeur. On change d'adresse sans toucher au code.
4. **Peu de dépendances.** Chaque bibliothèque ajoutée est une source de mises
   à jour et de failles potentielles : on n'en ajoute qu'en cas de vrai besoin.

## Technologies

| Rôle | Choix | Pourquoi |
|---|---|---|
| Générateur de site | [Astro](https://astro.build) | Zéro JavaScript par défaut, optimisation des images, contenus en Markdown validés, CSP intégrée |
| Contenus éditoriaux | Fichiers Markdown (`src/content/actualites/`) | Modifiables directement dans l'interface web de GitHub |
| Hébergement (prévisualisation) | GitHub Pages | Gratuit, publication automatique |
| Hébergement (définitif) | Hébergeur européen, à choisir | Souveraineté des données, attentes des clients publics |
| Intégration continue | GitHub Actions | Vérifie, construit et publie à chaque modification |

## Organisation des fichiers

```
.github/
  workflows/deploy.yml   Construction et publication automatiques
  dependabot.yml         Alertes et mises à jour de sécurité
deploy/                  En-têtes de sécurité pour l'hébergeur définitif
public/                  Fichiers copiés tels quels (icônes)
scripts/
  prepare-photos.mjs     Nettoyage des photos avant ajout au dépôt
src/
  assets/                Images optimisées automatiquement à la construction
    brand/               Logo
    photos/              Photos (déjà nettoyées de leurs métadonnées)
  components/            Éléments réutilisables (en-tête, pied de page…)
  content/actualites/    Un fichier Markdown par actualité
  content.config.ts      Champs obligatoires d'une actualité
  data/site.ts           Nom, coordonnées, menu : les informations centrales
  layouts/               Gabarit commun à toutes les pages
  lib/                   Petites fonctions utilitaires
  pages/                 Une page = un fichier (l'adresse suit le nom du fichier)
  styles/global.css      Couleurs, espacements et styles de base
astro.config.mjs         Configuration : adresse du site, sécurité
```

## Adresse du site et changement de domaine

L'adresse est fournie à la construction par deux variables d'environnement :

| Variable | GitHub Pages | Domaine définitif |
|---|---|---|
| `SITE_URL` | renseignée automatiquement par le workflow | `https://www.domaine.fr` |
| `BASE_PATH` | renseignée automatiquement (`/Anastomoz`) | `/` |
| `SITE_INDEXABLE` | `false` (défaut) | `true` |

Dans le code, les liens internes passent **toujours** par la fonction `url()`
(`src/lib/url.ts`), pour fonctionner aussi bien sous `/Anastomoz/` qu'à la racine
d'un domaine.

## Sécurité

| Mesure | Où |
|---|---|
| Politique de sécurité du contenu (CSP) avec empreintes des scripts et styles | `astro.config.mjs`, générée dans chaque page |
| En-têtes HTTP (HSTS, anti-iframe, `nosniff`, `Permissions-Policy`…) | `deploy/`, à activer chez l'hébergeur définitif (GitHub Pages ne le permet pas) |
| Non-indexation tant que le site n'est pas officiel | `SITE_INDEXABLE`, balise `noindex` et `robots.txt` |
| Métadonnées des photos (GPS, appareil) supprimées **avant** l'ajout au dépôt | `npm run photos` |
| Dépendances verrouillées (`package-lock.json`), audit à chaque construction | workflow |
| Actions GitHub épinglées par empreinte (SHA), droits minimaux | workflow |
| Aucun secret dans le dépôt | règle absolue, le dépôt est public |
| Double authentification sur le compte GitHub | activée |

### Ajouter une photo

Ne jamais déposer directement une photo sortie du téléphone : elle contient
souvent les coordonnées GPS du lieu de prise de vue.

```sh
npm run photos -- photos-originales/ma-photo.jpg src/assets/photos/nom-explicite.jpg
```

Le dossier `photos-originales/` est ignoré par Git.

## Formulaire de contact (à venir)

- Pendant le développement : formulaire construit, mais sans envoi.
- À la mise en ligne : script d'envoi hébergé chez l'hébergeur définitif (données
  en France, sans service tiers). Anti-spam sans Google : champ piège, contrôle
  de délai, [ALTCHA](https://altcha.org) si nécessaire.

## Carte interactive (à venir)

- Données : API [Hub'Eau](https://hubeau.eaufrance.fr) (poissons, qualité, température, hydrométrie).
- Fonds de carte : IGN Géoplateforme.
- Bibliothèque : Leaflet, chargée uniquement sur la page de la carte.
- À vérifier au moment du développement : accès des API depuis le navigateur (CORS).

## Plan de travail

1. [x] Socle technique : Astro, construction automatique, sécurité, pages légales modèles
2. [ ] Direction visuelle : maquette de la page d'accueil
3. [ ] Pages de contenu : Accueil, Prestations, Références, Équipe, Actualités, Contact
4. [ ] Actualités : notice de publication autonome
5. [ ] Carte Hub'Eau
6. [ ] Mise en ligne (voir ci-dessous)

## Checklist de mise en ligne

- [ ] Nom de domaine réservé
- [ ] Hébergeur européen choisi ; fichier de `deploy/` copié dans `public/`
- [ ] `SITE_URL`, `BASE_PATH=/` et `SITE_INDEXABLE=true` renseignés
- [ ] Mentions légales et politique de confidentialité complétées (SIRET, hébergeur…)
- [ ] Coordonnées réelles dans `src/data/site.ts`
- [ ] Envoi du formulaire de contact branché et testé
- [ ] Outil de mesure d'audience exempté de consentement (CNIL) choisi
- [ ] Logo définitif en SVG, avec une version simplifiée pour l'icône
- [ ] Plan du site (sitemap) pour les moteurs de recherche
- [ ] Dépôt passé en privé
