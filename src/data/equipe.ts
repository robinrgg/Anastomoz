import type { ImageMetadata } from 'astro';
import robin from '../assets/equipe/robin-reguig.jpg';
import leo from '../assets/equipe/leo-brun.jpg';

// Membres de l'équipe. Photos provisoires, à remplacer avant la mise en ligne.
// Les textes entre crochets sont à compléter.

export interface Membre {
  name: string;
  role: string;
  specialite: string;
  bio: string;
  photo: ImageMetadata;
  photoAlt: string;
}

export const equipe: Membre[] = [
  {
    name: 'Robin Reguig',
    role: 'Cogérant, associé',
    specialite: '[Spécialité, ex. hydrobiologiste]',
    bio: '[Parcours, domaines d’expertise, terrains de prédilection : deux ou trois phrases.]',
    photo: robin,
    photoAlt: 'Robin Reguig, au bord d’un plan d’eau, présente un black-bass.',
  },
  {
    name: 'Léo Brun',
    role: 'Cogérant, associé',
    specialite: '[Spécialité, ex. ingénieur halieute]',
    bio: '[Parcours, domaines d’expertise, terrains de prédilection : deux ou trois phrases.]',
    photo: leo,
    photoAlt: 'Léo Brun, chapeau de soleil, présente un black-bass devant une gravière.',
  },
];
