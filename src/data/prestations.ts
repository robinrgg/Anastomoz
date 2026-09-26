import type { ImageMetadata } from 'astro';
import inventaires from '../assets/photos/peche-electrique-groupe.jpg';
import plansEau from '../assets/photos/filets-demaillage.jpg';
import continuite from '../assets/photos/passe-a-poissons.jpg';
import gestion from '../assets/photos/gorges-vasque.jpg';

// Catalogue des prestations. Textes de travail : à relire et valider.
//
// Prix : chaque prestation peut recevoir un champ `prix` (ex. « à partir de 900 € HT »).
// Ils ne s'affichent que si `showPrices` vaut true dans src/data/site.ts.

export interface Prestation {
  title: string;
  prix?: string;
}

export interface Domaine {
  id: string;
  title: string;
  summary: string;
  image: ImageMetadata;
  imageAlt: string;
  prestations: Prestation[];
  livrables: string[];
}

export const domaines: Domaine[] = [
  {
    id: 'inventaires-piscicoles',
    title: 'Inventaires piscicoles',
    summary:
      'Connaître l’état des peuplements de poissons d’un cours d’eau : composition, abondance, structure en taille, et évolution dans le temps.',
    image: inventaires,
    imageAlt:
      'Une dizaine d’intervenants en waders progressent dans une rivière ombragée lors d’une pêche électrique.',
    prestations: [
      { title: 'Pêches électriques d’inventaire complètes par enlèvements successifs' },
      { title: 'Pêches partielles par points (échantillonnage ponctuel d’abondance)' },
      { title: 'Pêches de sauvegarde avant travaux en cours d’eau' },
      { title: 'Suivis pluriannuels de stations et calcul d’indices (IPR, IPR+)' },
    ],
    livrables: [
      'Rapport d’analyse et fiches stations',
      'Données brutes au format d’échange',
      'Restitution orale auprès du maître d’ouvrage',
    ],
  },
  {
    id: 'plans-d-eau',
    title: 'Plans d’eau et retenues',
    summary:
      'Caractériser les peuplements des lacs, retenues et gravières, et éclairer leur gestion piscicole et halieutique.',
    image: plansEau,
    imageAlt:
      'Un opérateur démaille des poissons pris dans un filet, sur une bâche étendue au bord d’une piste forestière.',
    prestations: [
      { title: 'Échantillonnage aux filets maillants multimailles' },
      { title: 'Suivis des peuplements lacustres et des espèces exotiques' },
      { title: 'Pêches de sauvegarde lors de vidanges' },
      { title: 'Biométrie, scalimétrie et état sanitaire des poissons' },
    ],
    livrables: [
      'Rapport de diagnostic du peuplement',
      'Recommandations de gestion',
      'Données bancarisées',
    ],
  },
  {
    id: 'continuite-ecologique',
    title: 'Continuité écologique',
    summary:
      'Évaluer la franchissabilité des ouvrages et l’efficacité des aménagements destinés à restaurer la libre circulation des poissons.',
    image: continuite,
    imageAlt:
      'Passe à poissons à macro-rugosités : des rangées de plots cylindriques dans un courant clair, au bord d’une grande rivière.',
    prestations: [
      { title: 'Diagnostic de franchissabilité des ouvrages' },
      { title: 'Suivi de l’efficacité des passes à poissons' },
      { title: 'Avis technique sur les projets d’aménagement' },
      { title: 'Suivis avant / après travaux de restauration' },
    ],
    livrables: [
      'Rapport de diagnostic et cartographie',
      'Préconisations hiérarchisées',
      'Indicateurs de suivi',
    ],
  },
  {
    id: 'conseil-gestion',
    title: 'Conseil et gestion halieutique',
    summary:
      'Accompagner les gestionnaires, les collectivités et les structures de pêche dans leurs choix, de la stratégie à la mise en œuvre.',
    image: gestion,
    imageAlt: 'Vasque turquoise au pied de hautes falaises calcaires couvertes de végétation.',
    prestations: [
      { title: 'Plans de gestion piscicole et halieutique' },
      { title: 'Appui aux fédérations et associations de pêche' },
      { title: 'Volet milieux aquatiques des études d’impact' },
      { title: 'Formation et sensibilisation des élus et usagers' },
    ],
    livrables: [
      'Document de gestion opérationnel',
      'Notes techniques et avis',
      'Supports de formation',
    ],
  },
];
