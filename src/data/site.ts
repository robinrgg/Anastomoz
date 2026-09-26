import { SITE_INDEXABLE } from 'astro:env/server';

// Informations centrales du site. Les valeurs entre crochets sont à compléter
// une fois la société immatriculée (voir la checklist dans ARCHITECTURE.md).

export const site = {
  name: 'Anastomoz',
  tagline: 'Bureau d’études en milieux aquatiques, poissons et pêche',
  description:
    'Anastomoz, bureau d’études et de conseil spécialisé dans les milieux aquatiques, les peuplements piscicoles et la gestion halieutique.',
  locale: 'fr_FR',
  contact: {
    email: '[contact@domaine.fr]',
    phone: '[téléphone]',
    city: '[ville]',
  },
  // Piloté par la variable SITE_INDEXABLE (voir astro.config.mjs et ARCHITECTURE.md).
  indexable: SITE_INDEXABLE,
} as const;

export const navigation = [
  { href: '/', label: 'Accueil' },
  { href: '/prestations/', label: 'Prestations' },
  { href: '/references/', label: 'Références' },
  { href: '/equipe/', label: 'Équipe' },
  { href: '/actualites/', label: 'Actualités' },
  { href: '/contact/', label: 'Contact' },
] as const;

export const legalLinks = [
  { href: '/mentions-legales/', label: 'Mentions légales' },
  { href: '/confidentialite/', label: 'Confidentialité' },
] as const;
