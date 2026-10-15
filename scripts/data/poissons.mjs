// Prépare la couche « Poissons » de la carte interactive.
//
// Deux sources Hub'Eau (Licence Ouverte Etalab) :
//  - API « État piscicole » : pêches de la base ASPE (OFB), avec espèces capturées ;
//  - API « Hydrobiologie » : notes IPR de la base Naïades (suivis commandés par les
//    agences de l'eau et les services de l'État), dont beaucoup de stations absentes
//    d'ASPE. Naïades ne publie que la note : la classe est calculée ici.
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
const API_HYDROBIO = `${HUBEAU}/v1/hydrobio`;
/** Distance en deçà de laquelle un point ASPE et une station Naïades sont un même site. */
const MEME_SITE_M = 300;
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

/** Ligne ASPE → site commun aux deux sources. */
function siteAspe(row) {
  return {
    source: 'aspe',
    code: String(row.code_point_prelevement_aspe),
    lat: round5(row.latitude),
    lon: round5(row.longitude),
    nom: nom(row),
    coursEau: row.libelle_entite_hydrographique ?? null,
    commune: row.libelle_commune ?? null,
    date: row.date_operation.slice(0, 10),
    operation: String(row.code_operation),
    protocole: row.protocole_peche ?? null,
    note: row.ipr_note == null ? null : Math.round(row.ipr_note * 10) / 10,
    classe: row.ipr_code_classe == null ? null : Number(row.ipr_code_classe),
    libelle: row.ipr_libelle_classe ?? null,
  };
}

/**
 * Classe d'état IPR à partir de la note (seuils nationaux 5, 16, 25, 36 ; ce
 * sont ceux qu'applique la base ASPE dans l'immense majorité des cas).
 */
const CLASSES = [[5, 'Très bon'], [16, 'Bon'], [25, 'Moyen'], [36, 'Médiocre'], [Infinity, 'Mauvais']];
function classeIpr(note) {
  const i = CLASSES.findIndex(([seuil]) => note <= seuil);
  return { classe: i + 1, libelle: CLASSES[i][1] };
}

/** Ligne Naïades → site commun aux deux sources. */
function siteNaiades(row) {
  const note = Math.round(row.resultat_indice * 10) / 10;
  return {
    source: 'naiades',
    code: row.code_station_hydrobio,
    lat: round5(row.latitude),
    lon: round5(row.longitude),
    nom: (row.libelle_station_hydrobio ?? '').trim(),
    coursEau: row.libelle_cours_eau ?? null,
    commune: row.libelle_commune ?? null,
    date: row.date_prelevement.slice(0, 10),
    operation: row.code_prelevement,
    protocole: null,
    note,
    ...classeIpr(note),
  };
}

const toRecord = (s) => [
  s.code, s.lat, s.lon, s.nom, s.coursEau, s.commune, s.date, s.operation, s.protocole, s.note, s.classe, s.libelle, s.source,
];

/** Distance approximative en mètres (suffisante à quelques centaines de mètres). */
function distance(a, b) {
  const rad = Math.PI / 180;
  const dx = (b.lon - a.lon) * rad * Math.cos(a.lat * rad);
  const dy = (b.lat - a.lat) * rad;
  return 6_371_000 * Math.hypot(dx, dy);
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
const sitesAspe = [...parPosition.values()].map(siteAspe);

// --- Naïades : dernière note IPR de chaque station. L'API refuse d'aller
// au-delà de 20 000 résultats par requête : on découpe par période.
console.log('Notes IPR Naïades (API Hydrobiologie)…');
const PERIODES = [['1950-01-01', '2007-12-31'], ['2008-01-01', '2013-12-31'], ['2014-01-01', '2018-12-31'], ['2019-01-01', '2100-12-31']];
const derniereNaiades = new Map();
for (const [debut, fin] of PERIODES) {
  const lignes = await getAllPages(`${API_HYDROBIO}/indices`, {
    code_indice: '7036', // Indice poisson rivière
    date_debut_prelevement: debut,
    date_fin_prelevement: fin,
    fields: [
      'code_station_hydrobio', 'libelle_station_hydrobio', 'libelle_cours_eau', 'libelle_commune', 'code_departement',
      'date_prelevement', 'code_prelevement', 'resultat_indice', 'libelle_qualification', 'latitude', 'longitude',
    ].join(','),
  });
  for (const row of lignes) {
    if (row.resultat_indice == null || row.latitude == null || row.longitude == null) continue;
    if (!isMetropole(row.code_departement) || row.libelle_qualification === 'incorrecte') continue;
    const actuel = derniereNaiades.get(row.code_station_hydrobio);
    if (!actuel || row.date_prelevement > actuel.date_prelevement) derniereNaiades.set(row.code_station_hydrobio, row);
  }
}
assertMinimum('Stations Naïades', derniereNaiades.size, 5_000);

// --- Fusion : une station Naïades à moins de MEME_SITE_M d'un point ASPE est le
// même site ; on garde la pêche la plus récente des deux.
const grille = new Map();
const caseDe = (s) => `${Math.floor(s.lat * 100)},${Math.floor(s.lon * 100)}`;
for (const site of sitesAspe) {
  const k = caseDe(site);
  if (!grille.has(k)) grille.set(k, []);
  grille.get(k).push(site);
}
function aspeLePlusProche(site) {
  const [i, j] = caseDe(site).split(',').map(Number);
  let meilleur = null;
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      for (const autre of grille.get(`${i + di},${j + dj}`) ?? []) {
        const d = distance(site, autre);
        if (!autre.remplace && d <= MEME_SITE_M && (!meilleur || d < meilleur.d)) meilleur = { site: autre, d };
      }
    }
  }
  return meilleur?.site ?? null;
}
const sitesNaiades = [];
let doublons = 0;
for (const site of [...derniereNaiades.values()].map(siteNaiades)) {
  const aspe = aspeLePlusProche(site);
  if (aspe && aspe.date >= site.date) { doublons++; continue; }
  if (aspe) aspe.remplace = true;
  sitesNaiades.push(site);
}
const sites = [...sitesAspe.filter((s) => !s.remplace), ...sitesNaiades];
const stations = sites.map(toRecord);
assertMinimum('Stations poissons', stations.length, 5_000);

await writeJson(OUTPUT, {
  genere: new Date().toISOString(),
  source: 'Hub’Eau, API État piscicole (OFB) et API Hydrobiologie (Naïades), Licence Ouverte Etalab',
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
    'source',
  ],
  stations,
});
const remplaces = sitesAspe.length - sites.length + sitesNaiades.length;
console.log(
  `${OUTPUT} : ${stations.length} sites (${sitesAspe.length - remplaces} ASPE, ${sitesNaiades.length} Naïades ; ` +
    `${doublons} stations Naïades déjà couvertes par ASPE, ${remplaces} points ASPE remplacés par une note Naïades plus récente).`,
);
