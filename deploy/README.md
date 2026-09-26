# Configuration de l'hébergement définitif

GitHub Pages ne permet pas de définir des en-têtes HTTP de sécurité. Les fichiers
de ce dossier seront copiés dans `public/` le jour de la mise en ligne, selon
l'hébergeur retenu :

| Hébergeur | Fichier à utiliser |
|---|---|
| Apache (OVHcloud, o2switch, la plupart des mutualisés) | `apache/.htaccess` → `public/.htaccess` |
| Hébergeurs statiques acceptant un fichier `_headers` | `_headers` → `public/_headers` |

La politique de sécurité du contenu (CSP) est déjà générée par Astro dans
chaque page. Ces en-têtes la complètent avec ce qui ne peut pas être défini
dans la page elle-même (interdiction d'affichage dans un cadre, HSTS…).

N'activer HSTS qu'une fois le HTTPS confirmé sur le domaine définitif.
