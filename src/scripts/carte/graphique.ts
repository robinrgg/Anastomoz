import { formatDebit, formatShortDate } from './dom';

// Graphique SVG des débits récents avec les débits caractéristiques en pointillés.
// Dessiné à la main (aucune bibliothèque) ; les styles sont dans la page (CSP).

const SVG = 'http://www.w3.org/2000/svg';
const W = 340;
const H = 170;
const M = { top: 12, right: 12, bottom: 24, left: 44 };

interface Point {
  date: string;
  valeur: number;
  instantane?: boolean;
}

interface Seuils {
  module: number | null;
  q25: number | null;
  qmna5: number | null;
}

function el<K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export function graphiqueDebits(points: Point[], seuils: Seuils): SVGSVGElement {
  const valeurs = points.map((p) => p.valeur);
  const maxDonnees = Math.max(0, ...valeurs);
  // Comme dans l'app terrain : le module n'est tracé que s'il reste lisible à l'échelle.
  const moduleVisible = seuils.module !== null && seuils.module <= Math.max(maxDonnees * 2, (seuils.q25 ?? 0) * 2, 0.01);
  const yMax =
    Math.max(maxDonnees, moduleVisible ? seuils.module! : 0, seuils.q25 ?? 0, seuils.qmna5 ?? 0) * 1.15 || 1;

  const x = (i: number) => M.left + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (W - M.left - M.right));
  const y = (v: number) => H - M.bottom - (v / yMax) * (H - M.top - M.bottom);

  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, class: 'graph', role: 'img' });
  svg.append(el('title', {}));
  svg.querySelector('title')!.textContent = 'Débit moyen journalier des derniers jours, avec les débits de référence';

  // Axe vertical : 3 graduations.
  for (const f of [0, 0.5, 1]) {
    const v = (yMax / 1.15) * f;
    svg.append(el('line', { x1: M.left, x2: W - M.right, y1: y(v), y2: y(v), class: 'graph__grid' }));
    const t = el('text', { x: M.left - 6, y: y(v) + 4, class: 'graph__label graph__label--y' });
    t.textContent = formatDebit(v);
    svg.append(t);
  }

  // Axe horizontal : première et dernière date.
  for (const i of [0, points.length - 1]) {
    if (!points[i]) continue;
    const t = el('text', { x: x(i), y: H - 6, class: `graph__label graph__label--x${i === 0 ? ' start' : ' end'}` });
    t.textContent = formatShortDate(points[i].date);
    svg.append(t);
  }

  const seuilsATracer: Array<[keyof Seuils, string]> = [
    ['qmna5', 'QMNA5'],
    ['q25', 'Q25'],
    ['module', 'Module'],
  ];
  for (const [cle, libelle] of seuilsATracer) {
    const v = seuils[cle];
    if (v === null || (cle === 'module' && !moduleVisible)) continue;
    svg.append(el('line', { x1: M.left, x2: W - M.right, y1: y(v), y2: y(v), class: `graph__seuil graph__seuil--${cle}` }));
    const t = el('text', { x: W - M.right, y: y(v) - 3, class: `graph__seuil-label graph__seuil-label--${cle}` });
    t.textContent = libelle;
    svg.append(t);
  }

  if (points.length > 0) {
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valeur).toFixed(1)}`).join(' ');
    svg.append(el('path', { d, class: 'graph__line' }));
    points.forEach((p, i) => {
      svg.append(el('circle', { cx: x(i), cy: y(p.valeur), r: p.instantane ? 4 : 2.5, class: p.instantane ? 'graph__point graph__point--now' : 'graph__point' }));
    });
  }

  return svg;
}
