import { formatDate, formatDebit, formatHour, formatShortDate } from './dom';

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

  if (points.length > 0) ajouterInfobulle(svg, points, x, y);

  return svg;
}

/**
 * Infobulle au survol (souris, doigt ou flèches du clavier) : repère vertical,
 * point mis en évidence, date et débit du point le plus proche.
 */
function ajouterInfobulle(svg: SVGSVGElement, points: Point[], x: (i: number) => number, y: (v: number) => number) {
  const groupe = el('g', { class: 'graph__hover', visibility: 'hidden', 'aria-hidden': 'true' });
  const repere = el('line', { y1: M.top, y2: H - M.bottom, class: 'graph__hover-line' });
  const pastille = el('circle', { r: 5, class: 'graph__hover-point' });
  const fond = el('rect', { rx: 4, height: 34, class: 'graph__hover-bg' });
  const ligneDebit = el('text', { class: 'graph__hover-value' });
  const ligneDate = el('text', { class: 'graph__hover-date' });
  groupe.append(repere, pastille, fond, ligneDebit, ligneDate);

  // Zone de capture invisible couvrant tout le graphique.
  const capture = el('rect', { x: 0, y: 0, width: W, height: H, class: 'graph__capture' });
  svg.append(groupe, capture);

  let courant = -1;
  function afficher(i: number) {
    courant = i;
    const p = points[i];
    const px = x(i);
    const py = y(p.valeur);
    repere.setAttribute('x1', String(px));
    repere.setAttribute('x2', String(px));
    pastille.setAttribute('cx', String(px));
    pastille.setAttribute('cy', String(py));
    ligneDebit.textContent = `${formatDebit(p.valeur)} m³/s`;
    ligneDate.textContent = p.instantane ? `Instantané · ${formatHour(p.date)}` : formatDate(p.date);
    groupe.setAttribute('visibility', 'visible');

    // Bulle à droite du point, ou à gauche près du bord ; au-dessus, ou en dessous près du haut.
    const largeur = Math.max(ligneDebit.getComputedTextLength(), ligneDate.getComputedTextLength()) + 16;
    const bx = px + 10 + largeur > W - 2 ? px - 10 - largeur : px + 10;
    const by = py - 42 < 2 ? py + 8 : py - 42;
    fond.setAttribute('x', String(bx));
    fond.setAttribute('y', String(by));
    fond.setAttribute('width', String(largeur));
    ligneDebit.setAttribute('x', String(bx + 8));
    ligneDebit.setAttribute('y', String(by + 14));
    ligneDate.setAttribute('x', String(bx + 8));
    ligneDate.setAttribute('y', String(by + 27));
    svg.setAttribute('aria-label', `${ligneDebit.textContent}, ${ligneDate.textContent}`);
  }

  function masquer() {
    courant = -1;
    groupe.setAttribute('visibility', 'hidden');
  }

  function indexProche(evenement: PointerEvent) {
    const matrice = svg.getScreenCTM();
    if (!matrice) return -1;
    const pt = new DOMPoint(evenement.clientX, evenement.clientY).matrixTransform(matrice.inverse());
    let meilleur = 0;
    for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - pt.x) < Math.abs(x(meilleur) - pt.x)) meilleur = i;
    return meilleur;
  }

  capture.addEventListener('pointermove', (e) => {
    const i = indexProche(e);
    if (i >= 0 && i !== courant) afficher(i);
  });
  capture.addEventListener('pointerdown', (e) => {
    const i = indexProche(e);
    if (i >= 0) afficher(i);
  });
  capture.addEventListener('pointerleave', masquer);

  // Clavier : le graphique est focalisable, les flèches parcourent les points.
  svg.setAttribute('tabindex', '0');
  svg.addEventListener('focus', () => afficher(points.length - 1));
  svg.addEventListener('blur', masquer);
  svg.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const pas = e.key === 'ArrowLeft' ? -1 : 1;
    afficher(Math.min(points.length - 1, Math.max(0, (courant < 0 ? points.length - 1 : courant) + pas)));
  });
}
