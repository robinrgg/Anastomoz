import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './carte.css';
import { chargerHydro, chargerPoissons, type StationHydro, type StationPoisson } from './donnees';
import { COULEUR_HYDRO, couleurIpr } from './couleurs';
import { ficheHydro, fichePoisson } from './fiches';
import { formatDate } from './dom';

// Carte interactive : fonds IGN, couche « Poissons » (IPR) et couche « Débits ».

const conteneur = document.getElementById('carte');
const panneau = document.getElementById('fiche');
const panneauContenu = document.getElementById('fiche-contenu');
const boutonFermer = document.getElementById('fiche-fermer');
const etat = document.getElementById('carte-etat');

if (conteneur && panneau && panneauContenu && boutonFermer && etat) {
  // ---------------------------------------------------------------- Fonds IGN
  const ign = (couche: string, format: string) =>
    L.tileLayer(
      'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&STYLE=normal&TILEMATRIXSET=PM' +
        `&LAYER=${couche}&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`,
      { maxZoom: 18, attribution: '© <a href="https://www.ign.fr/">IGN</a> — Géoplateforme' },
    );
  const plan = ign('GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2', 'image/png');
  const photos = ign('ORTHOIMAGERY.ORTHOPHOTOS', 'image/jpeg');

  // Cadrage initial : France métropolitaine et Corse, quelle que soit la taille d'écran.
  const FRANCE = L.latLngBounds([41.3, -5.2], [51.1, 9.6]);
  const carte = L.map(conteneur, {
    minZoom: 5,
    zoomSnap: 0.5,
    maxBounds: L.latLngBounds([40, -7], [52.5, 11.5]),
    layers: [plan],
    preferCanvas: true,
  });
  carte.fitBounds(FRANCE);
  L.control.layers({ 'Plan IGN': plan, 'Photographies aériennes': photos }, undefined, { position: 'topright' }).addTo(carte);
  L.control.scale({ imperial: false }).addTo(carte);
  carte.attributionControl.setPrefix(false);
  carte.attributionControl.addAttribution('Données : <a href="https://hubeau.eaufrance.fr/">Hub’Eau</a>');

  const rendu = L.canvas({ padding: 0.5 });
  // Ordre d'ajout = ordre d'affichage : les points « poissons », colorés, restent au-dessus.
  const coucheHydro = L.layerGroup().addTo(carte);
  const couchePoissons = L.layerGroup().addTo(carte);

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
        weight: 1.5,
        color: COULEUR_HYDRO,
        fillColor: '#ffffff',
        fillOpacity: 1,
      });
      m.bindTooltip(s.nom, { direction: 'top', offset: [0, -6] });
      m.on('click', () => ouvrirFiche(m, (signal) => ficheHydro(s, signal)));
      m.addTo(coucheHydro);
    }
  }

  // Cases à cocher de la légende : afficher / masquer chaque couche.
  for (const [id, couche] of [['couche-poissons', couchePoissons], ['couche-hydro', coucheHydro]] as const) {
    const caseACocher = document.getElementById(id) as HTMLInputElement | null;
    caseACocher?.addEventListener('change', () => {
      if (caseACocher.checked) {
        couche.addTo(carte);
        // Les points « poissons » doivent rester dessinés au-dessus des débits.
        if (couche === coucheHydro && carte.hasLayer(couchePoissons)) couchePoissons.remove().addTo(carte);
      } else {
        couche.remove();
      }
    });
  }

  // ---------------------------------------------------------------- Chargement
  Promise.allSettled([chargerPoissons(), chargerHydro()]).then(([poissons, hydro]) => {
    const messages: string[] = [];
    if (hydro.status === 'fulfilled') ajouterHydro(hydro.value.stations);
    if (poissons.status === 'fulfilled') {
      ajouterPoissons(poissons.value.stations);
      messages.push(`${poissons.value.stations.length.toLocaleString('fr-FR')} stations piscicoles (mises à jour le ${formatDate(poissons.value.genere)})`);
    } else {
      messages.push('Stations piscicoles indisponibles');
    }
    if (hydro.status === 'fulfilled') {
      messages.push(`${hydro.value.stations.length.toLocaleString('fr-FR')} stations hydrométriques actives`);
    } else {
      messages.push('Stations hydrométriques indisponibles');
    }
    etat.textContent = messages.join(' · ') + '.';
  });
}
