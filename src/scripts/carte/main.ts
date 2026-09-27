import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './carte.css';
import { chargerHydro, chargerPoissons, type StationHydro, type StationPoisson } from './donnees';
import { COULEUR_HYDRO, couleurIpr } from './couleurs';
import { ficheHydro, fichePoisson } from './fiches';

// Carte interactive : fonds IGN, couche « Poissons » (IPR) et couche « Débits ».

const conteneur = document.getElementById('carte');
const panneau = document.getElementById('fiche');
const panneauContenu = document.getElementById('fiche-contenu');
const boutonFermer = document.getElementById('fiche-fermer');
const etat = document.getElementById('carte-etat');

if (conteneur && panneau && panneauContenu && boutonFermer && etat) {
  // ---------------------------------------------------------------- Fonds IGN
  // Lien externe : toujours dans un nouvel onglet, pour ne pas quitter la carte.
  const lien = (href: string, texte: string) =>
    `<a href="${href}" target="_blank" rel="noopener noreferrer">${texte}<span class="visually-hidden"> (nouvel onglet)</span></a>`;
  const ATTRIBUTION_IGN = `© ${lien('https://www.ign.fr/', 'IGN')} — Géoplateforme`;

  const ign = (couche: string, style: string, matrices: string, format: string, options: L.TileLayerOptions = {}) =>
    L.tileLayer(
      'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0' +
        `&LAYER=${couche}&STYLE=${style}&TILEMATRIXSET=${matrices}&FORMAT=${format}` +
        '&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}',
      { maxZoom: 18, attribution: ATTRIBUTION_IGN, ...options },
    );

  // Plan « relief et rivières » : plan IGN adouci, estompage du relief et réseau
  // hydrographique mis en valeur. Les effets visuels sont définis dans carte.css.
  const planDoux = ign('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'normal', 'PM_0_19', 'image/png', { className: 'fond-plan' });
  const photos = ign('ORTHOIMAGERY.ORTHOPHOTOS', 'normal', 'PM_0_19', 'image/jpeg', { maxNativeZoom: 19 });

  // Cadrage initial : France métropolitaine et Corse, quelle que soit la taille d'écran.
  const FRANCE = L.latLngBounds([41.3, -5.2], [51.1, 9.6]);
  const carte = L.map(conteneur, {
    minZoom: 5,
    zoomSnap: 0.5,
    maxBounds: L.latLngBounds([40, -7], [52.5, 11.5]),
    preferCanvas: true,
  });
  carte.createPane('relief').classList.add('pane-relief');
  carte.createPane('rivieres').classList.add('pane-rivieres');

  const relief = ign('ELEVATION.ELEVATIONGRIDCOVERAGE.SHADOW', 'estompage_grayscale', 'PM_0_15', 'image/png', {
    pane: 'relief',
    maxNativeZoom: 15,
    attribution: '',
  });
  const rivieres = ign('HYDROGRAPHY.HYDROGRAPHY', 'normal', 'PM_6_18', 'image/png', {
    pane: 'rivieres',
    minZoom: 6,
    attribution: '',
  });
  const plan = L.layerGroup([planDoux, relief, rivieres]).addTo(carte);

  carte.fitBounds(FRANCE);
  L.control.layers({ 'Plan IGN — relief et rivières': plan, 'Photographies aériennes': photos }, undefined, { position: 'topright' }).addTo(carte);
  L.control.scale({ imperial: false }).addTo(carte);
  carte.attributionControl.setPrefix(false);
  carte.attributionControl.addAttribution(`Données : ${lien('https://hubeau.eaufrance.fr/', 'Hub’Eau')}`);

  const rendu = L.canvas({ padding: 0.5 });
  const couchePoissons = L.layerGroup().addTo(carte);
  const coucheHydro = L.layerGroup(); // affichée à la demande (une couche à la fois)

  // Taille des points selon le zoom : discrets à l'échelle nationale, plus gros de près.
  const rayon = () => { const z = carte.getZoom(); return z <= 6 ? 3.5 : z <= 8 ? 4.5 : 6; };
  const RAYON_SELECTION = 9;
  carte.on('zoomend', () => {
    const r = rayon();
    for (const couche of [couchePoissons, coucheHydro]) {
      couche.eachLayer((l) => { if (l !== selection) (l as L.CircleMarker).setRadius(r); });
    }
  });

  // ---------------------------------------------------------------- Fiche
  let requeteEnCours: AbortController | null = null;
  let selection: L.CircleMarker | null = null;

  function ouvrirFiche(marqueur: L.CircleMarker, construire: (signal: AbortSignal) => HTMLElement) {
    requeteEnCours?.abort();
    requeteEnCours = new AbortController();
    selection?.setRadius(rayon());
    selection = marqueur;
    marqueur.setRadius(RAYON_SELECTION).bringToFront();
    panneauContenu!.replaceChildren(construire(requeteEnCours.signal));
    panneau!.hidden = false;
    panneau!.scrollTop = 0;
    // Sur grand écran, décale la carte si la station est cachée sous la fiche.
    const largeurFiche = panneau!.offsetWidth;
    const point = carte.latLngToContainerPoint(marqueur.getLatLng());
    const limite = carte.getSize().x - largeurFiche - 40;
    if (window.matchMedia('(min-width: 56rem)').matches && point.x > limite) carte.panBy([point.x - limite, 0]);
    boutonFermer!.focus({ preventScroll: true });
  }

  function fermerFiche() {
    requeteEnCours?.abort();
    selection?.setRadius(rayon());
    selection = null;
    panneau!.hidden = true;
    conteneur!.focus({ preventScroll: true });
  }

  boutonFermer.addEventListener('click', fermerFiche);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panneau.hidden) fermerFiche();
  });

  // ---------------------------------------------------------------- Couches
  function ajouterPoissons(stations: StationPoisson[]) {
    for (const s of stations) {
      const m = L.circleMarker([s.lat, s.lon], {
        renderer: rendu,
        radius: rayon(),
        weight: 1,
        color: '#ffffff',
        fillColor: couleurIpr(s.iprClasse),
        fillOpacity: 0.95,
      });
      m.bindTooltip(s.nom, { direction: 'top', offset: [0, -6] });
      m.on('click', () => ouvrirFiche(m, (signal) => fichePoisson(s, signal)));
      m.addTo(couchePoissons);
    }
  }

  function ajouterHydro(stations: StationHydro[]) {
    for (const s of stations) {
      const m = L.circleMarker([s.lat, s.lon], {
        renderer: rendu,
        radius: rayon(),
        weight: 1,
        color: '#ffffff',
        fillColor: COULEUR_HYDRO,
        fillOpacity: 0.95,
      });
      m.bindTooltip(s.nom, { direction: 'top', offset: [0, -6] });
      m.on('click', () => ouvrirFiche(m, (signal) => ficheHydro(s, signal)));
      m.addTo(coucheHydro);
    }
  }

  // Boutons radio de la légende : une seule couche affichée à la fois.
  const couches = { poissons: couchePoissons, hydro: coucheHydro } as const;
  function afficherCouche(nom: keyof typeof couches) {
    if (selection) fermerFiche();
    for (const [cle, couche] of Object.entries(couches)) {
      if (cle === nom) couche.addTo(carte);
      else couche.remove();
    }
  }
  for (const radio of document.querySelectorAll<HTMLInputElement>('input[name="couche"]')) {
    radio.addEventListener('change', () => {
      if (radio.checked) afficherCouche(radio.value as keyof typeof couches);
    });
  }

  // ---------------------------------------------------------------- Chargement
  // La légende n'affiche un message que pendant le chargement ou en cas d'erreur.
  Promise.allSettled([chargerPoissons(), chargerHydro()]).then(([poissons, hydro]) => {
    const erreurs: string[] = [];
    if (hydro.status === 'fulfilled') ajouterHydro(hydro.value.stations);
    else erreurs.push('Stations hydrométriques indisponibles.');
    if (poissons.status === 'fulfilled') ajouterPoissons(poissons.value.stations);
    else erreurs.push('Stations piscicoles indisponibles.');
    etat.textContent = erreurs.join(' ');
  });
}
