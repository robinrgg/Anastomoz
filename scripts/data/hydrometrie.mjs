// Prépare la couche « Débits » de la carte interactive : la liste des stations
// hydrométriques en service ayant publié un débit récemment.
//
// Source : Hub'Eau, API Hydrométrie (Licence Ouverte Etalab).
// Les débits eux-mêmes ne sont pas stockés : la fiche les interroge en direct.
// Les débits caractéristiques (module, Q25, QMNA5) viennent du fichier de
// référence data/stations_debits.csv, calculé sur les chroniques complètes.
//
// Usage : node scripts/data/hydrometrie.mjs   (écrit public/data/carte/hydrometrie.json)

import { readFile } from 'node:fs/promises';
import { HUBEAU, assertMinimum, getAllPages, isMetropole, round5, writeJson } from './hubeau.mjs';

const API = `${HUBEAU}/v2/hydrometrie`;
const OUTPUT = 'public/data/carte/hydrometrie.json';
const REFERENCE_CSV = 'data/stations_debits.csv';
/** Une station est gardée si elle a publié un débit journalier sur cette période. */
const RECENT_DAYS = 15;

/** Lit le CSV de référence (séparateur virgule, sans champs entre guillemets). */
async function readReference() {
  const [header, ...lines] = (await readFile(REFERENCE_CSV, 'utf8')).trim().split(/\r?\n/);
  const columns = header.split(',');
  const reference = new Map();
  for (const line of lines) {
    const values = line.split(',');
    const row = Object.fromEntries(columns.map((name, i) => [name, values[i]]));
    const num = (v) => (v === undefined || v === '' ? null : Number(v));
    reference.set(row.code_station, {
      module: num(row.module_m3s),
      q25: num(row.q25_m3s),
      qmna5: num(row.qmna5_m3s),
      annees: num(row.nb_annees),
    });
  }
  return reference;
}

console.log('Stations hydrométriques en service…');
const stations = (
  await getAllPages(`${API}/referentiel/stations`, {
    en_service: 'true',
    fields: [
      'code_station',
      'libelle_station',
      'libelle_cours_eau',
      'libelle_commune',
      'code_departement',
      'latitude_station',
      'longitude_station',
    ].join(','),
  })
).filter((s) => isMetropole(s.code_departement) && s.latitude_station != null && s.longitude_station != null);

console.log(`Stations ayant publié un débit depuis ${RECENT_DAYS} jours…`);
const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString().slice(0, 10);
const recent = await getAllPages(
  `${API}/obs_elab`,
  { grandeur_hydro_elab: 'QmnJ', date_debut_obs_elab: since, fields: 'code_station,resultat_obs_elab' },
  { size: 20_000 },
);
const active = new Set(recent.filter((r) => r.resultat_obs_elab != null).map((r) => r.code_station));

const reference = await readReference();
const records = stations
  .filter((s) => active.has(s.code_station))
  .map((s) => {
    const ref = reference.get(s.code_station);
    return [
      s.code_station,
      round5(s.latitude_station),
      round5(s.longitude_station),
      s.libelle_station?.trim() ?? '',
      s.libelle_cours_eau ?? null,
      s.libelle_commune ?? null,
      ref?.module ?? null,
      ref?.q25 ?? null,
      ref?.qmna5 ?? null,
      ref?.annees ?? null,
    ];
  });
assertMinimum('Stations hydrométriques actives', records.length, 1_500);

await writeJson(OUTPUT, {
  genere: new Date().toISOString(),
  source: 'Hub’Eau — API Hydrométrie, Licence Ouverte Etalab',
  champs: ['code_station', 'lat', 'lon', 'nom', 'cours_eau', 'commune', 'module', 'q25', 'qmna5', 'annees'],
  stations: records,
});
const withRef = records.filter((r) => r[6] != null).length;
console.log(`${OUTPUT} : ${records.length} stations actives (${withRef} avec débits de référence).`);
