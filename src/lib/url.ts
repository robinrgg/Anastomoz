// Préfixe un chemin interne avec l'adresse de base du site.
// Indispensable pour que les liens fonctionnent aussi bien sur GitHub Pages
// (https://compte.github.io/Anastomoz/) que sur le domaine définitif.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function url(path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
