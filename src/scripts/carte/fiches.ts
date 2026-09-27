import type { StationHydro, StationPoisson } from './donnees';
import { situationHydro } from './couleurs';
import { capitalize, formatDate, formatDebit, formatHour, h } from './dom';
import { graphiqueDebits } from './graphique';

// Fiches affichées au clic sur une station. Les données « vivantes » (espèces,
// débits) sont demandées à Hub'Eau à ce moment-là, depuis le navigateur.

const HUBEAU = 'https://hubeau.eaufrance.fr/api';

async function hubeau<T>(chemin: string, params: Record<string, string>, signal: AbortSignal): Promise<T[]> {
  const res = await fetch(`${HUBEAU}${chemin}?${new URLSearchParams(params)}`, { signal });
  if (res.status !== 200 && res.status !== 206) throw new Error(`Hub’Eau indisponible (${res.status})`);
  return (await res.json()).data ?? [];
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

export function fichePoisson(station: StationPoisson, signal: AbortSignal): HTMLElement {
  const lieu = [station.coursEau, capitalize(station.commune)].filter(Boolean).join(' · ');

  const ipr =
    station.iprNote !== null
      ? h('div', { class: 'ipr' },
          h('p', { class: 'ipr__note' }, h('span', {}, station.iprNote.toLocaleString('fr-FR')), h('small', {}, 'IPR')),
          h('p', { class: 'ipr__classe' },
            h('span', { class: `pastille pastille--ipr-${station.iprClasse}`, 'aria-hidden': 'true' }),
            `État ${(station.iprLibelle ?? '').toLowerCase()}`,
          ),
        )
      : h('p', { class: 'fiche__note' }, 'Indice poisson rivière non applicable sur cette station (Corse).');

  const especes = h('div', { class: 'especes' }, chargement('Chargement des espèces…'));

  const fiche = h('article', { class: 'fiche', 'aria-labelledby': 'fiche-titre' },
    entete('Peuplement piscicole', station.nom, lieu),
    ipr,
    h('dl', { class: 'fiche__infos' },
      h('dt', {}, 'Dernière pêche'), h('dd', {}, formatDate(station.date)),
      station.protocole ? h('dt', {}, 'Protocole') : null,
      station.protocole ? h('dd', {}, station.protocole) : null,
    ),
    h('h3', { class: 'fiche__section' }, 'Espèces capturées'),
    especes,
    h('p', { class: 'fiche__source' }, 'Source : Hub’Eau, API État piscicole (OFB).'),
  );

  hubeau<{ nom_commun_taxon: string | null; nom_latin_taxon: string | null }>(
    '/v1/etat_piscicole/observations',
    { code_operation: station.codeOperation, fields: 'nom_commun_taxon,nom_latin_taxon', size: '5000' },
    signal,
  )
    .then((rows) => {
      const noms = new Map<string, string | null>();
      for (const r of rows) if (r.nom_commun_taxon) noms.set(r.nom_commun_taxon, r.nom_latin_taxon);
      const tries = [...noms].sort(([a], [b]) => a.localeCompare(b, 'fr'));
      especes.replaceChildren(
        tries.length === 0
          ? h('p', { class: 'fiche__note' }, 'Aucun poisson capturé lors de cette pêche.')
          : h('ul', { class: 'especes__liste' },
              ...tries.map(([commun, latin]) => h('li', {}, commun, latin ? h('i', {}, latin) : null)),
            ),
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
    h('p', { class: 'fiche__source' }, 'Source : Hub’Eau, API Hydrométrie. Données brutes, non validées.'),
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
      const situation = situationHydro(actuel.valeur, station);
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
      if (situation) blocs.push(h('p', { class: `situation situation--${situation.cle}` }, situation.libelle));
      blocs.push(
        h('h3', { class: 'fiche__section' }, 'Débit moyen journalier — 14 derniers jours'),
        serie.length > 1 ? graphiqueDebits(serie, station) : h('p', { class: 'fiche__note' }, 'Série trop courte pour tracer un graphique.'),
        h('p', { class: 'fiche__note' }, 'Débits en m³/s. Module, Q25 et QMNA5 calculés sur la chronique complète de la station.'),
      );
      contenu.replaceChildren(...blocs);
    })
    .catch((e) => {
      if (!signal.aborted) contenu.replaceChildren(erreur(`Débits indisponibles : ${e.message}`));
    });

  return fiche;
}

