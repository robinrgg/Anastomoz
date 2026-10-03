import type { StationHydro, StationPoisson } from './donnees';
import { capitalize, formatDate, formatDebit, formatHour, h } from './dom';
import { graphiqueDebits } from './graphique';

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

interface Observation { code_operation: number | string; date_operation: string; nom_commun_taxon: string | null }
interface PageObservations { data?: Observation[]; next?: string | null; count: number }

/** Toutes les observations d'une station depuis une date (suit la pagination). */
async function observationsStation(code: string, depuis: string, signal: AbortSignal): Promise<Observation[]> {
  let url: string | null = `${HUBEAU}/v1/etat_piscicole/observations?${new URLSearchParams({
    code_station: code,
    date_operation_min: depuis,
    fields: 'code_operation,date_operation,nom_commun_taxon',
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

export function fichePoisson(station: StationPoisson, signal: AbortSignal): HTMLElement {
  const lieu = [station.coursEau, capitalize(station.commune)].filter(Boolean).join(' · ');

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
    h('p', { class: 'fiche__source' }, 'Source : Hub’Eau'),
  );

  // Liste exhaustive des espèces capturées sur les 10 dernières années ; à défaut
  // (aucune pêche récente), celles du dernier suivi connu.
  const depuis = new Date();
  depuis.setFullYear(depuis.getFullYear() - ANNEES_ESPECES);
  const depuisIso = depuis.toISOString().slice(0, 10);

  observationsStation(station.code, depuisIso, signal)
    .then(async (lignes) => {
      let libelle: string;
      if (lignes.length > 0) {
        const operations = new Set(lignes.map((l) => String(l.code_operation)));
        const annees = lignes.map((l) => annee(l.date_operation)).sort();
        derniere.textContent = annees.at(-1)!;
        libelle = operations.size > 1
          ? `Espèces capturées depuis ${annee(depuisIso)} · ${operations.size} pêches, de ${annees[0]} à ${annees.at(-1)}`
          : `Espèces capturées lors de la pêche de ${annees[0]}`;
      } else {
        lignes = await hubeau<Observation>('/v1/etat_piscicole/observations', {
          code_operation: station.codeOperation,
          fields: 'code_operation,date_operation,nom_commun_taxon',
          size: '5000',
        }, signal);
        libelle = `Espèces capturées lors du dernier suivi (${annee(station.date)})`;
      }
      const noms = [...new Set(lignes.map((l) => l.nom_commun_taxon).filter((n): n is string => Boolean(n)))]
        .sort((a, b) => a.localeCompare(b, 'fr'));
      titreEspeces.textContent = libelle;
      especes.replaceChildren(
        noms.length === 0
          ? h('p', { class: 'fiche__note' }, 'Aucun poisson capturé.')
          : h('ul', { class: 'especes__liste' }, ...noms.map((nom) => h('li', {}, nom))),
      );
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

