// Prépare la couche « Poissons » de la carte interactive.
//
// Source : Hub'Eau, API « État piscicole » (données OFB, Licence Ouverte Etalab).
// Pour chaque station, on garde la pêche la plus récente ayant une note IPR.
// La Corse n'a pas d'IPR (indice non applicable) : on y garde la dernière pêche.
// La liste des espèces n'est pas stockée : la fiche l'interroge en direct.
//
// Usage : node scripts/data/poissons.mjs   (écrit public/data/carte/poissons.json)

import { HUBEAU, assertMinimum, getAllPages, isMetropole, round5, writeJson } from './hubeau.mjs';

const API = `${HUBEAU}/v1/etat_piscicole`;
const OUTPUT = 'public/data/carte/poissons.json';

const COMMON_FIELDS = [
  'code_station',
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

/** Garde, pour chaque station, la ligne la plus récente. */
function latestByStation(rows) {
  const byStation = new Map();
  for (const row of rows) {
    if (row.latitude == null || row.longitude == null || !isMetropole(row.code_departement)) continue;
    const current = byStation.get(row.code_station);
    if (!current || row.date_operation > current.date_operation) byStation.set(row.code_station, row);
  }
  return [...byStation.values()];
}

const nom = (row) => (row.libelle_point_prelevement_wama || row.libelle_station || '').trim();

function toRecord(row) {
  return [
    row.code_station,
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
const avecIpr = latestByStation(indicateurs.filter((row) => row.ipr_note != null));

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
const stationsIpr = new Set(avecIpr.map((row) => row.code_station));
const sansIpr = latestByStation(corse).filter((row) => !stationsIpr.has(row.code_station));

const stations = [...avecIpr, ...sansIpr].map(toRecord);
assertMinimum('Stations poissons', stations.length, 5_000);

await writeJson(OUTPUT, {
  genere: new Date().toISOString(),
  source: 'Hub’Eau, API État piscicole (OFB), Licence Ouverte Etalab',
  champs: [
    'code_station',
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
console.log(`${OUTPUT} : ${avecIpr.length} stations avec IPR, ${sansIpr.length} stations en Corse.`);
