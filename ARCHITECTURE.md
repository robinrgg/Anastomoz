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
| Carte | Leaflet (npm), fonds IGN Géoplateforme, données Hub'Eau | Léger, libre, servi par le site ; données publiques françaises |
| Polices | Fraunces (titres) et Source Sans 3 (texte), via Fontsource | Libres, servies par le site lui-même : aucun appel à Google Fonts |
| Intégration continue | GitHub Actions | Vérifie, construit et publie à chaque modification |

## Organisation des fichiers

```
.github/
  workflows/deploy.yml   Construction et publication automatiques
  workflows/donnees-carte.yml  Actualisation automatique des données de la carte
  dependabot.yml         Alertes et mises à jour de sécurité
deploy/                  En-têtes de sécurité pour l'hébergeur définitif
data/stations_debits.csv Débits de référence (module, Q25, QMNA5) par station
public/                  Fichiers copiés tels quels (icônes)
  data/carte/            Stations de la carte (générées, ne pas modifier à la main)
scripts/
  prepare-photos.mjs     Nettoyage des photos avant ajout au dépôt
  check-images.mjs       Contrôle : aucune coordonnée GPS dans les images
  data/                  Préparation des données de la carte depuis Hub'Eau
src/
  assets/                Images optimisées automatiquement à la construction
    brand/               Logo
    photos/              Photos (déjà nettoyées de leurs métadonnées)
  components/            Éléments réutilisables (en-tête, pied de page…)
  content/actualites/    Un dossier par actualité (index.md + photo)
  content/references/    Un fichier Markdown par référence (voir modele.md)
  content.config.ts      Champs obligatoires des actualités et références
  data/site.ts           Nom, coordonnées, menu, affichage des prix
  data/prestations.ts    Catalogue des prestations (prix facultatifs)
  data/equipe.ts         Membres de l'équipe
  layouts/               Gabarit commun à toutes les pages
  lib/                   Petites fonctions utilitaires
  pages/                 Une page = un fichier (l'adresse suit le nom du fichier)
  scripts/carte/         Code de la carte interactive (navigateur)
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
| `CONTACT_ENDPOINT` | vide : formulaire affiché mais désactivé | adresse du script d'envoi |

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
| Contrôle automatique : la construction échoue si une image contient des coordonnées GPS | `npm run check:images` |
| Dépendances verrouillées (`package-lock.json`), audit à chaque construction | workflow |
| Actions GitHub épinglées par empreinte (SHA), droits minimaux | workflow |
| Exceptions CSP limitées à la carte (IGN, Hub'Eau) | `src/pages/carte.astro` |
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

- Pendant le développement : formulaire construit (validation, champ piège, mention RGPD) mais désactivé tant que `CONTACT_ENDPOINT` est vide.
- À la mise en ligne : script d'envoi hébergé chez l'hébergeur définitif (données
  en France, sans service tiers). Anti-spam sans Google : champ piège, contrôle
  de délai, [ALTCHA](https://altcha.org) si nécessaire.

## Carte interactive

Page `/carte/`. Deux couches, sur fonds IGN (plan ou photographies aériennes) :

| Couche | Préparé à l'avance (GitHub Actions) | Interrogé en direct au clic |
|---|---|---|
| **Poissons** | Dernière pêche de chaque station : note et classe IPR, date, protocole (API État piscicole). Corse : dernière pêche, IPR non applicable. | Espèces capturées lors de cette pêche |
| **Débits** | Stations en service ayant publié un débit sur les 15 derniers jours, avec module, Q25 et QMNA5 (`data/stations_debits.csv`) | Débit instantané et débits journaliers des 14 derniers jours |

**Actualisation** : le workflow `donnees-carte.yml` régénère `public/data/carte/*.json`
(poissons le 1er du mois, débits chaque lundi), les enregistre dans le dépôt puis
relance la publication. Lancement manuel : onglet Actions → « Données de la carte ».
Les scripts refusent d'écrire un fichier anormalement petit (panne de l'API) : la
carte garde alors les données précédentes.

**Sécurité** : exceptions à la CSP limitées à la page de la carte
(`Astro.csp.insertDirective`) : `img-src https://data.geopf.fr` (tuiles IGN) et
`connect-src https://hubeau.eaufrance.fr` (données en direct). Les textes venant des
API sont insérés comme texte, jamais comme HTML. Leaflet est installé via npm et servi
par le site (aucun CDN). Graphique des débits dessiné en SVG, sans bibliothèque.

**Débits de référence** : `data/stations_debits.csv` provient de l'application
Bilan hydro-météo (dépôt `turbo-app`). Pour le mettre à jour, remplacer le fichier
puis lancer le workflow « Données de la carte ».

## Plan de travail

1. [x] Socle technique : Astro, construction automatique, sécurité, pages légales modèles
2. [x] Direction visuelle : maquette de la page d'accueil
3. [x] Pages de contenu : Accueil, Prestations, Références, Équipe, Actualités, Contact (textes à valider)
4. [x] Actualités : notice de publication autonome ([docs/publier-une-actualite.md](docs/publier-une-actualite.md))
5. [x] Carte interactive Hub'Eau (poissons et débits)
6. [ ] Mise en ligne (voir ci-dessous)

## Checklist de mise en ligne

- [ ] Nom de domaine réservé
- [ ] Hébergeur européen choisi ; fichier de `deploy/` copié dans `public/`
- [ ] `SITE_URL`, `BASE_PATH=/` et `SITE_INDEXABLE=true` renseignés
- [ ] Mentions légales et politique de confidentialité complétées (SIRET, hébergeur…)
- [ ] Coordonnées réelles dans `src/data/site.ts`
- [ ] Envoi du formulaire de contact branché et testé
- [ ] Outil de mesure d'audience exempté de consentement (CNIL) choisi
- [ ] Photos définitives de l'équipe (`src/assets/equipe/`, via `npm run photos`)
- [ ] Forme de la SCOP (SARL ou SAS) reportée dans les mentions légales et les fonctions de l'équipe
- [ ] Logo définitif en SVG, avec une version simplifiée pour l'icône
- [ ] Plan du site (sitemap) pour les moteurs de recherche
- [ ] Dépôt passé en privé
