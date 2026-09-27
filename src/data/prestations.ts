import type { ImageMetadata } from 'astro';
import inventaires from '../assets/photos/peche-electrique-groupe.jpg';
import plansEau from '../assets/photos/filets-demaillage.jpg';
import hydromorphologie from '../assets/photos/passe-a-poissons.jpg';
import debits from '../assets/photos/gorges-vasque.jpg';
import reglementaire from '../assets/photos/equipe-riviere.jpg';
import numerique from '../assets/photos/biometrie-neige.jpg';

// Catalogue des prestations, source unique pour la page Prestations et l'accueil.
// Textes de travail : à relire et valider.
//
// Prix : chaque prestation peut recevoir un champ `prix` (ex. « à partir de 900 € HT »).
// Ils ne s'affichent que si `showPrices` vaut true dans src/data/site.ts.

export interface Prestation {
  title: string;
  detail?: string;
  prix?: string;
}

export interface Domaine {
  id: string;
  title: string;
  /** Une phrase, pour la carte de l'accueil. */
  short: string;
  summary: string;
  image: ImageMetadata;
  imageAlt: string;
  prestations: Prestation[];
  /** Protocoles, méthodes et outils mis en œuvre. */
  methodes: string[];
}

export const domaines: Domaine[] = [
  {
    id: 'inventaires-piscicoles',
    title: 'Inventaires piscicoles',
    short: 'Pêches électriques normalisées, ADN environnemental, suivis d’espèces patrimoniales.',
    summary:
      'Connaître l’état des peuplements de poissons : composition, abondance, structure en taille et évolution dans le temps, jusqu’au suivi des espèces rares.',
    image: inventaires,
    imageAlt:
      'Une dizaine d’intervenants en waders progressent dans une rivière ombragée lors d’une pêche électrique.',
    prestations: [
      {
        title: 'Pêches électriques d’inventaire',
        detail: 'Complètes par enlèvements successifs ou partielles, selon les protocoles normalisés.',
      },
      {
        title: 'Inventaires par ADN environnemental',
        detail: 'Prélèvements de terrain et validation critique des listes d’espèces issues du laboratoire.',
      },
      {
        title: 'Espèces patrimoniales',
        detail: 'Suivi et conservation des chabots endémiques méditerranéens (Plan national d’actions).',
      },
      {
        title: 'Suivis réglementaires',
        detail: 'Suivis piscicoles pluriannuels pour les exploitants industriels et hydroélectriques.',
      },
      {
        title: 'Pêches de sauvegarde',
        detail: 'Avant travaux en cours d’eau ou vidange de plan d’eau.',
      },
    ],
    methodes: ['LRC', 'CAPPPE', 'PPP mixte', 'IPR / IPR+', 'ADNe', 'Réseaux de suivi OFB'],
  },
  {
    id: 'plans-d-eau',
    title: 'Plans d’eau et retenues',
    short: 'Échantillonnage des peuplements lacustres, bathymétrie, plans d’échantillonnage.',
    summary:
      'Caractériser les peuplements des lacs, retenues et gravières, et éclairer leur gestion, en tenant compte du fonctionnement propre aux retenues hydroélectriques.',
    image: plansEau,
    imageAlt:
      'Un opérateur démaille des poissons pris dans un filet, sur une bâche étendue au bord d’une piste forestière.',
    prestations: [
      {
        title: 'Échantillonnage aux filets maillants',
        detail: 'Peuplements lacustres, espèces exotiques, biométrie et état sanitaire.',
      },
      {
        title: 'Bathymétrie de retenues',
        detail: 'Relevés au sondeur, modèle numérique de terrain, isobathes.',
      },
      {
        title: 'Plans d’échantillonnage',
        detail: 'Stratification par profondeur et habitats, adaptée à la cote et au marnage.',
      },
    ],
    methodes: ['Filets maillants multimailles', 'Sondeur', 'MNT', 'SIG'],
  },
  {
    id: 'hydromorphologie',
    title: 'Hydromorphologie et diagnostics écologiques',
    short: 'Diagnostics de cours d’eau, continuité écologique, indicateurs biologiques.',
    summary:
      'Comprendre le fonctionnement physique et biologique d’un cours d’eau pour hiérarchiser les pressions et orienter les actions de restauration.',
    image: hydromorphologie,
    imageAlt:
      'Passe à poissons à macro-rugosités : des rangées de plots cylindriques dans un courant clair, au bord d’une grande rivière.',
    prestations: [
      {
        title: 'Diagnostics hydromorphologiques',
        detail: 'Relevés de géométrie, de faciès et de granulométrie ; évaluation de l’état physique.',
      },
      {
        title: 'Analyse diachronique',
        detail: 'Évolution des lits à partir de l’imagerie historique et des SIG.',
      },
      {
        title: 'Continuité écologique',
        detail: 'Évaluation de la franchissabilité des ouvrages et suivi des aménagements.',
      },
      {
        title: 'Indicateurs biologiques',
        detail: 'Poissons, invertébrés et diatomées pour qualifier l’état écologique.',
      },
    ],
    methodes: ['CARHYCE', 'IAM', 'ICE', 'IPR / IPR+', 'IBGN', 'IBD'],
  },
  {
    id: 'debits-habitats',
    title: 'Débits et habitats aquatiques',
    short: 'Débits minimums biologiques, modélisation de l’habitat, hydrologie et jaugeages.',
    summary:
      'Relier le débit à la qualité de l’habitat des poissons, pour fixer des débits réglementaires justifiés et anticiper les étiages.',
    image: debits,
    imageAlt: 'Vasque turquoise au pied de hautes falaises calcaires couvertes de végétation.',
    prestations: [
      {
        title: 'Débit minimum biologique (DMB)',
        detail: 'Évaluation à l’aval des ouvrages, y compris sur torrents de montagne à forte pente.',
      },
      {
        title: 'Modélisation de l’habitat piscicole',
        detail: 'Relation débit-habitat, seuils critiques et seuils d’accroissement du risque.',
      },
      {
        title: 'Hydrologie',
        detail: 'Traitement de séries hydrométriques : module, QMNA5, VCN10, débits classés.',
      },
      {
        title: 'Jaugeages',
        detail: 'Jaugeages au moulinet (ISO 748) et construction de courbes de tarage.',
      },
    ],
    methodes: ['ESTIMHAB', 'HABBY', 'Stathab', 'ISO 748', 'Hub’Eau'],
  },
  {
    id: 'reglementaire-conseil',
    title: 'Études réglementaires et conseil',
    short: 'DCE, Natura 2000, études d’impact, plans de gestion piscicole.',
    summary:
      'Accompagner les maîtres d’ouvrage publics et privés dans leurs obligations réglementaires et leurs choix de gestion, de la stratégie à la mise en œuvre.',
    image: reglementaire,
    imageAlt:
      'L’équipe pose dans une rivière, en waders, avec épuisettes et anode de pêche électrique.',
    prestations: [
      {
        title: 'Évaluations d’incidences Natura 2000',
        detail: 'Volet milieux aquatiques et espèces piscicoles.',
      },
      {
        title: 'Études d’impact',
        detail: 'État initial, analyse des effets et mesures pour les milieux aquatiques.',
      },
      {
        title: 'Plans de gestion piscicole et halieutique',
        detail: 'Pour les fédérations, associations de pêche et gestionnaires.',
      },
      {
        title: 'Assistance à maîtrise d’ouvrage',
        detail: 'Rédaction de cahiers des charges, analyse d’offres, suivi d’études.',
      },
    ],
    methodes: ['DCE', 'Natura 2000', 'Continuité écologique', 'Protocoles OFB'],
  },
  {
    id: 'donnees-outils',
    title: 'Données et outils numériques',
    short: 'Cartographie, traitement de données, rapports automatisés, applications de terrain.',
    summary:
      'Notre différence : nous développons nos propres outils. Les études sont plus rapides et plus fiables, et nos clients reçoivent des livrables plus riches.',
    image: numerique,
    imageAlt:
      'Un technicien saisit des mesures sur une tablette, à une table installée dans la neige au bord d’un torrent.',
    prestations: [
      {
        title: 'Cartographie et SIG',
        detail: 'Atlas cartographiques, fonds IGN, cartes hors-ligne pour le terrain.',
      },
      {
        title: 'Traitement et analyse de données',
        detail: 'Exploitation des données publiques (Hub’Eau, OFB), statistiques et modélisation.',
      },
      {
        title: 'Rapports automatisés',
        detail: 'Comptes rendus et fiches de résultats générés directement depuis les données de terrain.',
      },
      {
        title: 'Applications de terrain',
        detail: 'Saisie numérique hors-ligne sur téléphone ou tablette, adaptée à vos protocoles.',
      },
    ],
    methodes: ['QGIS', 'Python', 'API Hub’Eau', 'Géoplateforme IGN', 'Applications web hors-ligne'],
  },
];
