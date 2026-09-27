// Outils communs pour interroger l'API Hub'Eau depuis les scripts de préparation
// des données de la carte (exécutés par GitHub Actions, jamais dans le navigateur).

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

export const HUBEAU = 'https://hubeau.eaufrance.fr/api';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** GET JSON avec nouvelles tentatives (Hub'Eau répond parfois lentement). */
export async function getJson(url, { tries = 4 } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(180_000) });
      // Hub'Eau renvoie 206 (Partial Content) quand la réponse est paginée.
      if (res.status !== 200 && res.status !== 206) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt >= tries) throw new Error(`${url} : ${err.message}`);
      console.warn(`  nouvelle tentative (${attempt}/${tries - 1}) : ${err.message}`);
      await sleep(5_000 * attempt);
    }
  }
}

/**
 * Parcourt toutes les pages d'un point d'accès en suivant le lien `next`
 * (numéro de page ou curseur selon les API).
 */
export async function getAllPages(endpoint, params, { size = 10_000 } = {}) {
  const rows = [];
  let url = `${endpoint}?${new URLSearchParams({ ...params, size: String(size) })}`;
  for (let page = 1; url; page++) {
    const body = await getJson(url);
    const data = body.data ?? [];
    rows.push(...data);
    console.log(`  page ${page} : ${rows.length} / ${body.count}`);
    url = data.length > 0 && rows.length < body.count ? body.next : null;
  }
  return rows;
}

/** Écrit un fichier JSON compact, en créant le dossier si besoin. */
export async function writeJson(path, data) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(data));
}

/** Départements de France métropolitaine et de Corse (exclut l'outre-mer). */
export const isMetropole = (codeDepartement) =>
  typeof codeDepartement === 'string' && !codeDepartement.startsWith('97');

/** Arrondit une coordonnée à 5 décimales (~1 m), pour alléger les fichiers. */
export const round5 = (value) => Math.round(Number(value) * 1e5) / 1e5;

/** Contrôle de cohérence : refuse d'écrire un fichier anormalement petit. */
export function assertMinimum(label, count, minimum) {
  if (count < minimum) {
    throw new Error(`${label} : ${count} éléments seulement (minimum attendu ${minimum}). Données non mises à jour.`);
  }
}
