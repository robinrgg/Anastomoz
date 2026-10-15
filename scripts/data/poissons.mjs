// Prépare la couche « Poissons » de la carte interactive.
//
// Source : Hub'Eau, API « État piscicole » (données OFB, Licence Ouverte Etalab).
// Pour chaque point de prélèvement, on garde la pêche la plus récente ayant une
// note IPR. On regroupe par point (code_point_prelevement_aspe, toujours
// renseigné) et non par station Sandre : beaucoup de points anciens n'ont pas de
// code station, et ils étaient tous fusionnés en un seul.
// La Corse n'a pas d'IPR (indice non applicable) : on y garde la dernière pêche.
// La liste des espèces n'est pas stockée : la fiche l'interroge en direct.
//
// Usage : node scripts/data/poissons.mjs   (écrit public/data/carte/poissons.json)

import { HUBEAU, assertMinimum, getAllPages, isMetropole, round5, writeJson } from './hubeau.mjs';

const API = `${HUBEAU}/v1/etat_piscicole`;
const OUTPUT = 'public/data/carte/poissons.json';

const COMMON_FIELDS = [
  'code_point_prelevement_aspe',
  'libelle_station',
  'libelle_point_prelevement_wama',
  'code_operation',
  'date_operation',
  'latitude',
  'longitude',
  'libelle_entite_hydrographique',
  'libelle_commune',
  'code_departement',
  'protocole_peche',
];

/** Garde, pour chaque point de prélèvement, la ligne la plus récente. */
function latestByPoint(rows) {
  const byPoint = new Map();
  for (const row of rows) {
    if (row.code_point_prelevement_aspe == null) continue;
    if (row.latitude == null || row.longitude == null || !isMetropole(row.code_departement)) continue;
    const current = byPoint.get(row.code_point_prelevement_aspe);
    if (!current || row.date_operation > current.date_operation) byPoint.set(row.code_point_prelevement_aspe, row);
  }
  return [...byPoint.values()];
}

const nom = (row) => (row.libelle_point_prelevement_wama || row.libelle_station || '').trim();

function toRecord(row) {
  return [
    String(row.code_point_prelevement_aspe),
    round5(row.latitude),
    round5(row.longitude),
    nom(row),
    row.libelle_entite_hydrographique ?? null,
    row.libelle_commune ?? null,
    row.date_operation.slice(0, 10),
    String(row.code_operation),
    row.protocole_peche ?? null,
    row.ipr_note == null ? null : Math.round(row.ipr_note * 10) / 10,
    row.ipr_code_classe == null ? null : Number(row.ipr_code_classe),
    row.ipr_libelle_classe ?? null,
  ];
}

console.log('Indicateurs IPR (France métropolitaine)…');
const indicateurs = await getAllPages(`${API}/indicateurs`, {
  fields: [...COMMON_FIELDS, 'ipr_note', 'ipr_code_classe', 'ipr_libelle_classe'].join(','),
  ipr_note_min: '0',
});
const avecIpr = latestByPoint(indicateurs.filter((row) => row.ipr_note != null));

console.log('Pêches en Corse (IPR non applicable)…');
const corse = [];
for (const departement of ['2A', '2B']) {
  corse.push(
    ...(await getAllPages(`${API}/operations`, {
      fields: COMMON_FIELDS.join(','),
      code_departement: departement,
    })),
  );
}
const pointsIpr = new Set(avecIpr.map((row) => row.code_point_prelevement_aspe));
const sansIpr = latestByPoint(corse).filter((row) => !pointsIpr.has(row.code_point_prelevement_aspe));

// Quelques points distincts partagent exactement les mêmes coordonnées (point
// recréé au même endroit) : on garde la pêche la plus récente.
const parPosition = new Map();
for (const row of [...avecIpr, ...sansIpr]) {
  const cle = `${round5(row.latitude)},${round5(row.longitude)}`;
  const actuel = parPosition.get(cle);
  if (!actuel || row.date_operation > actuel.date_operation) parPosition.set(cle, row);
}
const stations = [...parPosition.values()].map(toRecord);
assertMinimum('Stations poissons', stations.length, 5_000);

await writeJson(OUTPUT, {
  genere: new Date().toISOString(),
  source: 'Hub’Eau, API État piscicole (OFB), Licence Ouverte Etalab',
  champs: [
    'code_point',
    'lat',
    'lon',
    'nom',
    'cours_eau',
    'commune',
    'date',
    'code_operation',
    'protocole',
    'ipr_note',
    'ipr_classe',
    'ipr_libelle',
  ],
  stations,
});
console.log(`${OUTPUT} : ${stations.length} points (${avecIpr.length} avec IPR, ${sansIpr.length} en Corse, avant dédoublonnage).`);
