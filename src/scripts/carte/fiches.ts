import type { StationHydro, StationPoisson } from './donnees';
import { capitalize, formatDate, formatDebit, formatHour, h } from './dom';
import { graphiqueDebits } from './graphique';
import especesCsv from '../../data/especes-poissons.csv?raw';

// Fiches affichées au clic sur une station. Les données « vivantes » (espèces,
// débits) sont demandées à Hub'Eau à ce moment-là, depuis le navigateur.

const HUBEAU = 'https://hubeau.eaufrance.fr/api';

/** Requête JSON vers Hub'Eau, avec une nouvelle tentative (le service a des ratés passagers). */
async function recuperer<T>(url: string, signal: AbortSignal, essais = 2): Promise<T> {
  try {
    const res = await fetch(url, { signal });
    if (res.status !== 200 && res.status !== 206) throw new Error(`Hub’Eau indisponible (${res.status})`);
    return await res.json();
  } catch (e) {
    if (signal.aborted || essais <= 1) throw e;
    await new Promise((resolve) => setTimeout(resolve, 1500));
    return recuperer(url, signal, essais - 1);
  }
}

async function hubeau<T>(chemin: string, params: Record<string, string>, signal: AbortSignal): Promise<T[]> {
  const corps = await recuperer<{ data?: T[] }>(`${HUBEAU}${chemin}?${new URLSearchParams(params)}`, signal);
  return corps.data ?? [];
}

const jourIso = (decalageJours = 0) => new Date(Date.now() - decalageJours * 86_400_000).toISOString().slice(0, 10);

function entete(type: string, titre: string, lieu: string) {
  return h('header', { class: 'fiche__head' },
    h('p', { class: 'fiche__type' }, type),
    h('h2', { class: 'fiche__titre', id: 'fiche-titre' }, titre),
    h('p', { class: 'fiche__lieu' }, lieu),
  );
}

const chargement = (texte: string) => h('p', { class: 'fiche__loading', role: 'status' }, texte);
const erreur = (texte: string) => h('p', { class: 'fiche__erreur', role: 'alert' }, texte);

// ------------------------------------------------------------------ Poissons

/** Fenêtre de recherche des espèces : les 10 dernières années. */
const ANNEES_ESPECES = 10;

/**
 * Table des espèces (src/data/especes-poissons.csv) : nom français par code taxon
 * Sandre, et taxons à ne pas afficher (colonne afficher = non). Un taxon absent
 * de la table garde le nom de l'OFB (fiches ASPE) ou son nom latin (fiches Naïades).
 */
const TABLE_ESPECES = especesCsv
  .trim()
  .split(/\r?\n/)
  .slice(1)
  .map((ligne) => ligne.split(';').map((v) => v.trim()));
const NOMS = new Map(TABLE_ESPECES.filter(([, , nom]) => nom).map(([code, , nom]) => [code, nom]));
const MASQUES = new Set(TABLE_ESPECES.filter(([, , , afficher]) => afficher === 'non').map(([code]) => code));

interface Espece { nom: string; latin: boolean }
interface ListeEspeces { libelle: string; especes: Espece[]; derniere?: string }

interface Observation { code_operation: number | string; date_operation: string; code_taxon: string | null; nom_commun_taxon: string | null }
interface PageObservations { data?: Observation[]; next?: string | null; count: number }

/** Toutes les observations d'un point de prélèvement depuis une date (suit la pagination). */
async function observationsStation(code: string, depuis: string, signal: AbortSignal): Promise<Observation[]> {
  let url: string | null = `${HUBEAU}/v1/etat_piscicole/observations?${new URLSearchParams({
    code_point_prelevement_aspe: code,
    date_operation_min: depuis,
    fields: 'code_operation,date_operation,code_taxon,nom_commun_taxon',
    size: '20000',
  })}`;
  const lignes: Observation[] = [];
  while (url) {
    const corps: PageObservations = await recuperer<PageObservations>(url, signal);
    lignes.push(...(corps.data ?? []));
    url = corps.data?.length && lignes.length < corps.count ? corps.next ?? null : null;
  }
  return lignes;
}

const annee = (iso: string) => iso.slice(0, 4);

/** Libellé de la liste : fenêtre de 10 ans ou dernier suivi. */
function libelleListe(dates: string[], depuisIso: string, dernierSuivi: boolean, nbOperations: number) {
  const annees = dates.map(annee).sort();
  if (dernierSuivi) return `Espèces capturées lors du dernier suivi (${annees.at(-1)})`;
  return nbOperations > 1
    ? `Espèces capturées depuis ${annee(depuisIso)} · ${nbOperations} pêches, de ${annees[0]} à ${annees.at(-1)}`
    : `Espèces capturées lors de la pêche de ${annees[0]}`;
}

function trier(especes: Espece[]): Espece[] {
  const parNom = new Map(especes.map((e) => [e.nom, e]));
  return [...parNom.values()].sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

/** Base ASPE (OFB) : observations des 10 dernières années, sinon de la dernière pêche. */
async function especesAspe(station: StationPoisson, depuisIso: string, signal: AbortSignal): Promise<ListeEspeces> {
  let lignes = await observationsStation(station.code, depuisIso, signal);
  const dernierSuivi = lignes.length === 0;
  if (dernierSuivi) {
    lignes = await hubeau<Observation>('/v1/etat_piscicole/observations', {
      code_operation: station.codeOperation,
      fields: 'code_operation,date_operation,code_taxon,nom_commun_taxon',
      size: '5000',
    }, signal);
  }
  const dates = lignes.map((l) => l.date_operation);
  return {
    libelle: libelleListe(dates.length ? dates : [station.date], depuisIso, dernierSuivi, new Set(lignes.map((l) => String(l.code_operation))).size),
    derniere: dates.length ? annee(dates.sort().at(-1)!) : undefined,
    especes: trier(lignes.flatMap((l) => {
      const code = String(l.code_taxon ?? '');
      if (MASQUES.has(code)) return [];
      const nom = NOMS.get(code) ?? l.nom_commun_taxon;
      return nom ? [{ nom, latin: false }] : [];
    })),
  };
}

interface TaxonNaiades { code_appel_taxon: string; libelle_appel_taxon: string; date_prelevement: string; code_prelevement: string }

/** Base Naïades : listes faunistiques « poissons » de la station, si elles sont publiées. */
async function especesNaiades(station: StationPoisson, depuisIso: string, signal: AbortSignal): Promise<ListeEspeces> {
  const dernierSuivi = station.date < depuisIso;
  // Dernier suivi : filtre par code de prélèvement (date_debut_prelevement exclut
  // le jour donné, il ne retrouverait pas la pêche elle-même).
  const lignes = await hubeau<TaxonNaiades>('/v1/hydrobio/taxons', {
    ...(dernierSuivi ? { code_prelevement: station.codeOperation } : { code_station_hydrobio: station.code, date_debut_prelevement: depuisIso }),
    code_support: '4',
    fields: 'code_appel_taxon,libelle_appel_taxon,date_prelevement,code_prelevement',
    size: '5000',
  }, signal);
  const dates = lignes.map((l) => l.date_prelevement);
  return {
    libelle: lignes.length
      ? libelleListe(dates, depuisIso, dernierSuivi, new Set(lignes.map((l) => l.code_prelevement)).size)
      : 'Espèces capturées',
    especes: trier(lignes.flatMap((l) => {
      if (MASQUES.has(l.code_appel_taxon)) return [];
      const nom = NOMS.get(l.code_appel_taxon);
      return [nom ? { nom, latin: false } : { nom: l.libelle_appel_taxon, latin: true }];
    })),
  };
}

export function fichePoisson(station: StationPoisson, signal: AbortSignal): HTMLElement {
  const lieu = [station.coursEau, capitalize(station.commune)].filter(Boolean).join(' · ');
  const naiades = station.source === 'naiades';

  const ipr =
    station.iprNote !== null
      ? h('div', { class: 'ipr' },
          h('p', { class: 'ipr__note' }, h('span', {}, station.iprNote.toLocaleString('fr-FR')), h('small', {}, `IPR ${annee(station.date)}`)),
          h('p', { class: 'ipr__classe' },
            h('span', { class: `pastille pastille--ipr-${station.iprClasse}`, 'aria-hidden': 'true' }),
            `État ${(station.iprLibelle ?? '').toLowerCase()}`,
          ),
        )
      : h('p', { class: 'fiche__note' }, 'Indice poisson rivière non applicable sur cette station (Corse).');

  const derniere = h('dd', {}, annee(station.date));
  const titreEspeces = h('h3', { class: 'fiche__section' }, 'Espèces capturées');
  const especes = h('div', { class: 'especes' }, chargement('Recherche des espèces capturées…'));

  const fiche = h('article', { class: 'fiche', 'aria-labelledby': 'fiche-titre' },
    entete('Peuplement piscicole', station.nom, lieu),
    ipr,
    h('dl', { class: 'fiche__infos' },
      h('dt', {}, 'Dernière pêche'), derniere,
      station.protocole ? h('dt', {}, 'Protocole') : null,
      station.protocole ? h('dd', {}, station.protocole) : null,
    ),
    titreEspeces,
    especes,
    h('p', { class: 'fiche__source' }, naiades ? 'Source : Hub’Eau · Naïades' : 'Source : Hub’Eau · OFB'),
  );

  // Liste exhaustive des espèces capturées sur les 10 dernières années ; à défaut
  // (aucune pêche récente), celles du dernier suivi connu.
  const depuis = new Date();
  depuis.setFullYear(depuis.getFullYear() - ANNEES_ESPECES);
  const depuisIso = depuis.toISOString().slice(0, 10);

  (naiades ? especesNaiades(station, depuisIso, signal) : especesAspe(station, depuisIso, signal))
    .then((liste) => {
      titreEspeces.textContent = liste.libelle;
      if (liste.derniere) derniere.textContent = liste.derniere;
      const blocs: Node[] = [
        liste.especes.length > 0
          ? h('ul', { class: 'especes__liste' }, ...liste.especes.map((e) => h('li', {}, e.latin ? h('i', {}, e.nom) : e.nom)))
          : h('p', { class: 'fiche__note' }, naiades ? 'Liste des espèces non publiée pour cette station.' : 'Aucun poisson capturé.'),
      ];
      if (liste.especes.some((e) => e.latin)) {
        blocs.push(h('p', { class: 'fiche__note' }, 'Noms en italique : noms scientifiques (pas encore de nom français validé).'));
      }
      especes.replaceChildren(...blocs);
    })
    .catch((e) => {
      if (!signal.aborted) especes.replaceChildren(erreur(`Liste des espèces indisponible : ${e.message}`));
    });

  return fiche;
}

// ------------------------------------------------------------------ Débits

interface ObsElab { date_obs_elab: string; resultat_obs_elab: number | null }
interface ObsTr { date_obs: string; resultat_obs: number | null }

const litresEnM3 = (v: number) => v / 1000;

function tuile(valeur: string, libelle: string, modificateur = '') {
  return h('div', { class: `tuile ${modificateur}` }, h('p', { class: 'tuile__valeur' }, valeur), h('p', { class: 'tuile__libelle' }, libelle));
}

export function ficheHydro(station: StationHydro, signal: AbortSignal): HTMLElement {
  const lieu = [station.coursEau, capitalize(station.commune)].filter(Boolean).join(' · ');
  const contenu = h('div', { class: 'hydro' }, chargement('Interrogation des débits en temps réel…'));

  const fiche = h('article', { class: 'fiche', 'aria-labelledby': 'fiche-titre' },
    entete('Débits en temps réel', station.nom, lieu),
    contenu,
    h('p', { class: 'fiche__source' }, 'Source : Hub’Eau · données brutes, non validées'),
  );

  Promise.all([
    hubeau<ObsElab>('/v2/hydrometrie/obs_elab', {
      code_entite: station.code,
      grandeur_hydro_elab: 'QmnJ',
      date_debut_obs_elab: jourIso(14),
      size: '50',
    }, signal),
    hubeau<ObsTr>('/v2/hydrometrie/observations_tr', {
      code_entite: station.code,
      grandeur_hydro: 'Q',
      size: '1',
      sort: 'desc',
    }, signal).catch(() => [] as ObsTr[]),
  ])
    .then(([journaliers, instantanes]) => {
      const points = journaliers
        .filter((d) => d.resultat_obs_elab !== null)
        .sort((a, b) => a.date_obs_elab.localeCompare(b.date_obs_elab))
        .map((d) => ({ date: d.date_obs_elab, valeur: litresEnM3(d.resultat_obs_elab!) }));

      const dernierTr = instantanes.find((d) => d.resultat_obs !== null);
      const instantane = dernierTr ? { date: dernierTr.date_obs, valeur: litresEnM3(dernierTr.resultat_obs!) } : null;
      const dernierJour = points.at(-1) ?? null;
      // Le débit instantané n'est retenu que s'il est au moins aussi récent que le dernier débit journalier.
      const actuel =
        instantane && (!dernierJour || instantane.date >= dernierJour.date) ? { ...instantane, instantane: true } : dernierJour;

      if (!actuel) {
        contenu.replaceChildren(h('p', { class: 'fiche__note' }, 'Aucune mesure de débit disponible sur les 14 derniers jours.'));
        return;
      }

      const libelleActuel = 'instantane' in actuel
        ? `Débit instantané (${formatHour(actuel.date)})`
        : `Débit du ${formatDate(actuel.date)}`;
      const annees = station.annees ? ` (${station.annees} ans)` : '';
      const serie = 'instantane' in actuel && actuel.date.slice(0, 10) !== dernierJour?.date.slice(0, 10)
        ? [...points, { ...actuel }]
        : points;

      const blocs: Node[] = [
        h('div', { class: 'tuiles' },
          tuile(`${formatDebit(actuel.valeur)} m³/s`, libelleActuel, 'tuile--actuel'),
          tuile(formatDebit(station.module), `Module${annees}`),
          tuile(formatDebit(station.q25), 'Q25'),
          tuile(formatDebit(station.qmna5), 'QMNA5'),
        ),
      ];
      blocs.push(
        h('h3', { class: 'fiche__section' }, 'Débit moyen journalier sur 14 jours'),
        serie.length > 1 ? graphiqueDebits(serie, station) : h('p', { class: 'fiche__note' }, 'Série trop courte pour tracer un graphique.'),
      );
      contenu.replaceChildren(...blocs);
    })
    .catch((e) => {
      if (!signal.aborted) contenu.replaceChildren(erreur(`Débits indisponibles : ${e.message}`));
    });

  return fiche;
}

