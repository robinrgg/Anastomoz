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
export const COULEUR_HYDRO = '#0c3558';

export const couleurIpr = (classe: number | null) =>
  CLASSES_IPR.find((c) => c.code === classe)?.couleur ?? COULEUR_SANS_IPR;

/** Situation hydrologique d'un débit par rapport aux débits caractéristiques. */
export function situationHydro(debit: number | null, ref: { module: number | null; q25: number | null; qmna5: number | null }) {
  if (debit === null) return null;
  if (ref.qmna5 !== null && debit <= ref.qmna5) return { cle: 'etiage', libelle: 'Étiage sévère (≤ QMNA5)' };
  if (ref.q25 !== null && debit <= ref.q25) return { cle: 'basses', libelle: 'Basses eaux (≤ Q25)' };
  if (ref.module !== null && debit <= ref.module) return { cle: 'moyennes', libelle: 'Eaux moyennes (≤ module)' };
  if (ref.module !== null) return { cle: 'hautes', libelle: 'Hautes eaux (> module)' };
  return null;
}
