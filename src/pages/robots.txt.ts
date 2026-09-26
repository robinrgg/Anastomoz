import type { APIRoute } from 'astro';
import { site } from '../data/site';

// Tant que le site n'est pas officiellement en ligne, on demande aux moteurs
// de recherche de ne rien indexer (la balise noindex est aussi présente sur chaque page).
export const GET: APIRoute = () =>
  new Response(site.indexable ? 'User-agent: *\nAllow: /\n' : 'User-agent: *\nDisallow: /\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
