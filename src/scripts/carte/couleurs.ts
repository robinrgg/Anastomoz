// Codes couleur partagés par la carte, sa légende et ses fiches.

/** Classes de qualité IPR, couleurs conventionnelles de l'état écologique (DCE). */
export const CLASSES_IPR = [
  { code: 1, libelle: 'Très bon', couleur: '#2e6fd1' },
  { code: 2, libelle: 'Bon', couleur: '#3ba55c' },
  { code: 3, libelle: 'Moyen', couleur: '#f2c200' },
  { code: 4, libelle: 'Médiocre', couleur: '#f08a24' },
  { code: 5, libelle: 'Mauvais', couleur: '#d63a2f' },
] as const;

export const COULEUR_SANS_IPR = '#8a99a6';
/** Stations hydrométriques : bleu « eau » soutenu, bien visible sur les deux fonds. */
export const COULEUR_HYDRO = '#1565c0';

export const couleurIpr = (classe: number | null) =>
  CLASSES_IPR.find((c) => c.code === classe)?.couleur ?? COULEUR_SANS_IPR;
