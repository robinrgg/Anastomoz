import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Actualités : un fichier Markdown par article dans src/content/actualites/.
// Le schéma ci-dessous garantit qu'aucun champ obligatoire n'est oublié :
// la construction du site échoue avec un message clair sinon.
const actualites = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/actualites' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(120),
      date: z.coerce.date(),
      description: z.string().max(300),
      image: image().optional(),
      imageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }).refine((data) => !data.image || data.imageAlt, {
      message: 'imageAlt est obligatoire quand une image est renseignée (accessibilité).',
      path: ['imageAlt'],
    }),
});

// Références : un fichier Markdown par étude réalisée dans src/content/references/.
// Le champ domaine reprend les identifiants de src/data/prestations.ts.
const references = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/references' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().max(120),
      client: z.string(),
      lieu: z.string(),
      annee: z.number().int().min(2000).max(2100),
      domaine: z.enum(['inventaires-piscicoles', 'plans-d-eau', 'continuite-ecologique', 'conseil-gestion']),
      description: z.string().max(400),
      image: image().optional(),
      imageAlt: z.string().optional(),
      draft: z.boolean().default(false),
    }).refine((data) => !data.image || data.imageAlt, {
      message: 'imageAlt est obligatoire quand une image est renseignée (accessibilité).',
      path: ['imageAlt'],
    }),
});

export const collections = { actualites, references };
