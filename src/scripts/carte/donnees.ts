import { url } from '../../lib/url';

// Stations préparées chaque mois par scripts/data/*.mjs (voir ARCHITECTURE.md).

export interface StationPoisson {
  code: string;
  lat: number;
  lon: number;
  nom: string;
  coursEau: string | null;
  commune: string | null;
  date: string;
  codeOperation: string;
  protocole: string | null;
  iprNote: number | null;
  iprClasse: number | null;
  iprLibelle: string | null;
}

export interface StationHydro {
  code: string;
  lat: number;
  lon: number;
  nom: string;
  coursEau: string | null;
  commune: string | null;
  module: number | null;
  q25: number | null;
  qmna5: number | null;
  annees: number | null;
}

interface Fichier<T> {
  genere: string;
  source: string;
  stations: T[];
}

type LignePoisson = [string, number, number, string, string | null, string | null, string, string, string | null, number | null, number | null, string | null];
type LigneHydro = [string, number, number, string, string | null, string | null, number | null, number | null, number | null, number | null];

async function charger<T>(chemin: string): Promise<Fichier<T>> {
  const res = await fetch(url(chemin));
  if (!res.ok) throw new Error(`Chargement impossible (${res.status})`);
  return res.json();
}

export async function chargerPoissons() {
  const fichier = await charger<LignePoisson>('/data/carte/poissons.json');
  return {
    genere: fichier.genere,
    stations: fichier.stations.map(
      ([code, lat, lon, nom, coursEau, commune, date, codeOperation, protocole, iprNote, iprClasse, iprLibelle]): StationPoisson => ({
        code, lat, lon, nom, coursEau, commune, date, codeOperation, protocole, iprNote, iprClasse, iprLibelle,
      }),
    ),
  };
}

export async function chargerHydro() {
  const fichier = await charger<LigneHydro>('/data/carte/hydrometrie.json');
  return {
    genere: fichier.genere,
    stations: fichier.stations.map(
      ([code, lat, lon, nom, coursEau, commune, module, q25, qmna5, annees]): StationHydro => ({
        code, lat, lon, nom, coursEau, commune, module, q25, qmna5, annees,
      }),
    ),
  };
}
