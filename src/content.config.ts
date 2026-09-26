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

export const collections = { actualites };
