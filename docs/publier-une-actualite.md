# Publier une actualité

Cette notice explique comment ajouter une actualité au site **sans rien
installer**, directement depuis GitHub. Comptez 10 minutes la première fois,
puis 5 minutes.

> En cas de doute, vous pouvez toujours demander à Claude : « Publie cette
> actualité » avec le texte et la photo.

---

## 1. Le principe

Chaque actualité est **un dossier** rangé dans `src/content/actualites/`. Il
contient :

- un fichier **`index.md`** : le texte de l'article et ses informations (titre,
  date…) ;
- une **photo** (facultative), par exemple `photo.jpg`.

Le nom du dossier devient l'adresse de la page. Par exemple, le dossier
`2026-10-peche-sur-le-tavignano` donnera
`…/actualites/2026-10-peche-sur-le-tavignano/`.

**Règles pour le nom du dossier** : minuscules, sans accents ni espaces, mots
séparés par des tirets. Commencez par l'année et le mois pour garder les
dossiers dans l'ordre.

Dès que vous enregistrez, GitHub vérifie l'article puis met le site à jour, en
deux minutes environ.

---

## 2. Préparer la photo (important)

Les photos de téléphone contiennent souvent **la position GPS** de l'endroit
où elles ont été prises. Le dépôt étant public, cette position deviendrait
visible par tous. C'est gênant pour une station de pêche ou un site sensible.

**Avant d'envoyer une photo, retirez sa localisation :**

- **iPhone** : dans Photos, sélectionnez la photo, touchez *Partager*, puis
  *Options* en haut de l'écran, et désactivez *Localisation*. Enregistrez
  ensuite la photo dans *Fichiers* : c'est cette copie qu'il faut envoyer.
- **Android** : dans Google Photos ou la Galerie, ouvrez les *Détails* ou
  *Infos* de la photo, puis supprimez la position (l'intitulé varie selon les
  téléphones).
- **Ordinateur** (si Node.js est installé) :
  `npm run photos -- ma-photo.jpg src/content/actualites/mon-dossier/photo.jpg`

**Autres conseils :**

- Un poids de **3 Mo maximum** suffit largement : le site redimensionne les
  images tout seul.
- Évitez les noms de fichier avec espaces ou accents : `photo.jpg` convient
  très bien.
- Pour les personnes reconnaissables, assurez-vous d'avoir leur accord.

**Filet de sécurité** : si une photo contient encore des coordonnées GPS, la
mise à jour du site est bloquée et GitHub vous prévient. Le fichier reste
cependant dans l'historique du dépôt : prévenez Claude, qui le nettoiera.

---

## 3. Le modèle à copier

Copiez ce texte dans votre fichier `index.md` et remplacez les valeurs.

```markdown
---
title: "Titre de l'actualité"
date: 2026-10-15
description: "Une ou deux phrases qui résument l'article. Elles apparaissent dans la liste des actualités et sur les réseaux sociaux."
image: ./photo.jpg
imageAlt: "Description de la photo pour les personnes malvoyantes, par exemple : deux techniciens mesurent une truite sur une planche graduée."
draft: false
---

Premier paragraphe de l'article.

## Un intertitre

Deuxième paragraphe…
```

### Les champs

| Champ | Obligatoire | Règle |
|---|---|---|
| `title` | oui | 120 caractères au plus |
| `date` | oui | format **AAAA-MM-JJ**, par exemple `2026-10-15` |
| `description` | oui | 300 caractères au plus |
| `image` | non | `./` suivi du nom exact du fichier photo |
| `imageAlt` | **oui, s'il y a une photo** | décrit ce que montre la photo |
| `draft` | non | `true` pour cacher l'article (brouillon), `false` pour le publier |

### Les trois pièges à éviter

1. **Mettez toujours le titre, la description et `imageAlt` entre guillemets
   droits** `"…"`. Sans eux, un simple `:` dans le titre bloque tout.
2. **N'utilisez pas de guillemets droits `"` à l'intérieur** de ces textes :
   préférez les guillemets français « … » ou l'apostrophe.
3. Gardez les deux lignes `---` qui encadrent les informations, et ne mettez
   pas d'espace avant les noms des champs.

Pas de photo ? Supprimez simplement les lignes `image:` et `imageAlt:`.

---

## 4. Publier depuis GitHub

### Méthode A — depuis un ordinateur (recommandée, avec photo)

1. Sur votre ordinateur, créez un dossier nommé par exemple
   `2026-10-peche-sur-le-tavignano`.
2. Mettez dedans votre photo, nettoyée (voir section 2), et un fichier texte
   `index.md` contenant le modèle rempli. Utilisez un éditeur de texte simple
   (Bloc-notes, TextEdit en mode « texte brut »), pas Word.
3. Sur github.com, ouvrez le dépôt, puis les dossiers `src` → `content` →
   `actualites`.
4. Cliquez sur **Add file → Upload files**.
5. **Glissez le dossier entier** dans la zone prévue.
6. En bas de la page, écrivez un court message (par exemple « Actualité pêche
   Tavignano ») et cliquez sur **Commit changes**.

### Méthode B — sans photo, depuis n'importe quel appareil

1. Sur github.com, allez dans `src/content/actualites`.
2. Cliquez sur **Add file → Create new file**.
3. Dans le champ du nom, tapez `2026-10-mon-article/index.md`. La barre `/`
   crée le dossier automatiquement.
4. Collez le modèle rempli, sans les lignes `image` et `imageAlt`.
5. Cliquez sur **Commit changes…** puis confirmez.

Pour **ajouter une photo ensuite** :

1. Ouvrez le dossier de l'article, puis **Add file → Upload files** pour
   déposer la photo.
2. Ouvrez `index.md`, cliquez sur le crayon ✏️ pour le modifier, ajoutez les
   lignes `image:` et `imageAlt:`, puis enregistrez.

---

## 5. Vérifier la publication

1. Ouvrez l'onglet **Actions** du dépôt.
2. La ligne du haut porte votre message :
   - pastille jaune : en cours ;
   - ✅ vert : c'est en ligne, rechargez le site ;
   - ❌ rouge : l'article contient une erreur. **Le site reste dans son état
     précédent**, rien n'est cassé.

En cas d'erreur rouge, cliquez sur la ligne, puis sur **Vérification et
construction**, et cherchez le message en rouge :

| Message | Cause | Solution |
|---|---|---|
| `imageAlt est obligatoire…` | photo sans description | ajouter `imageAlt: "…"` |
| `title: … Too big` / `description: … Too big` | texte trop long | raccourcir |
| `date: Expected type "date"` | mauvais format de date | écrire `AAAA-MM-JJ` |
| `bad indentation of a mapping entry` | guillemets manquants ou mal placés | voir « Les trois pièges » |
| `Could not find requested image` (`ImageNotFound`) | nom de photo différent de celui du fichier | vérifier l'orthographe exacte, y compris `.jpg` ou `.JPG` |
| `Images contenant des coordonnées GPS` | photo non nettoyée | prévenir Claude |

Corrigez le fichier avec le crayon ✏️ puis enregistrez : une nouvelle
vérification démarre automatiquement.

---

## 6. Modifier, masquer ou supprimer une actualité

- **Modifier** : ouvrez `index.md`, cliquez sur le crayon ✏️, corrigez,
  enregistrez.
- **Masquer temporairement** : remplacez `draft: false` par `draft: true`.
- **Supprimer** : ouvrez le fichier, puis menu **…** → **Delete file**. Faites
  de même pour la photo.

L'article d'exemple `2026-09-anastomoz-prend-forme` peut être supprimé dès que
la première vraie actualité est publiée.

---

## 7. Mémo de mise en forme (Markdown)

| Vous tapez | Résultat |
|---|---|
| `**texte**` | **texte en gras** |
| `*Salmo trutta*` | *italique* (noms d'espèces) |
| `## Intertitre` | un intertitre de section |
| `- élément` | une liste à puces |
| `1. élément` | une liste numérotée |
| `[texte du lien](https://adresse.fr)` | un lien |
| une ligne vide | un nouveau paragraphe |
| `![description](./photo-2.jpg)` | une photo supplémentaire dans le texte |

N'utilisez pas `#` seul (titre principal) : le titre de l'article est déjà
affiché automatiquement.
