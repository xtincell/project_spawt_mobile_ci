import { useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
maplibregl.setWorkerUrl(mapWorkerUrl);
import { loadPublicPlaces, type PublicPlace } from '../lib/public-places';
export default function MapPage() {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const filtered = useMemo(() => places.filter(p => `${p.name} ${p.neighborhood} ${p.cuisine.join(' ')}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))), [places, query]);
  const active = places.find(p => p.id === selected);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(false);
    loadPublicPlaces(controller.signal).then(setPlaces).catch(e => {if (e.name !== 'AbortError') setError(true);}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (!container.current) return;
    try {
      map.current = new maplibregl.Map({container: container.current, style: 'https://tiles.openfreemap.org/styles/dark', center: [-4.0267,5.3364], zoom: 11, attributionControl: {compact: true}});
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');
      map.current.on('error', () => setMapError(true));
      map.current.on('load', () => setMapError(false));
    } catch { setMapUnavailable(true); setMapError(true); }
    return () => {map.current?.remove(); map.current = null;};
  }, []);
  useEffect(() => {
    if (!map.current) return;
    const markers = filtered.filter(p => p.lat !== null && p.lng !== null).map(p => {
      const button = document.createElement('button'); button.type = 'button'; button.className = `spot-pin${selected === p.id ? ' spot-pin--active' : ''}`; button.setAttribute('aria-label', p.name); button.textContent = '●'; button.onclick = () => setSelected(p.id);
      return new maplibregl.Marker({element: button}).setLngLat([p.lng!,p.lat!]).addTo(map.current!);
    });
    return () => markers.forEach(m => m.remove());
  }, [filtered, selected]);
  function select(p: PublicPlace) {setSelected(p.id); if(p.lng !== null && p.lat !== null) map.current?.flyTo({center:[p.lng,p.lat],zoom:14,essential:false});}
  return <main className="spot-explorer container">
    <header className="spot-explorer__heading"><p className="eyebrow">ABIDJAN · LES SPOTS</p><h1>Une adresse, un point sur la carte.</h1><p>Explorez les adresses publiées dans SPAWT (relevé du 18 octobre 2026). Sélectionnez une carte ou un repère pour voir la fiche. Les positions sont celles renseignées par SPAWT ; confirmez votre destination auprès du lieu.</p></header>
    <label className="spot-search">Chercher une adresse ou un quartier<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kaiten, Zone 4…" type="search" /></label>
    {loading && <p role="status">Chargement des adresses…</p>}
    {error && <p role="alert">Les adresses sont indisponibles. <button onClick={()=>setAttempt(a=>a+1)}>Réessayer</button></p>}
    <div className={`spot-explorer__grid${mapUnavailable ? " spot-explorer__grid--list" : ""}`}><section aria-label="Carte des spots" className={`spot-map${mapUnavailable ? " spot-map--unavailable" : ""}`}><div ref={container} className="spot-map__canvas"/>{mapError && <p className="spot-map__notice">{mapUnavailable ? "Ce navigateur ne permet pas d’afficher la carte interactive. Retrouvez toutes les adresses dans les fiches ci-dessous." : "Le fond de carte est momentanément indisponible. Les fiches restent accessibles."}</p>}</section>
    <section className="spot-list" aria-label="Liste des spots"><p aria-live="polite">{filtered.length} adresse{filtered.length !== 1 ? 's' : ''}</p>{!loading && !error && filtered.length === 0 && <p>Aucune adresse pour cette recherche.</p>}{filtered.map(p=><button key={p.id} className={`spot-card${selected===p.id?' spot-card--active':''}`} aria-pressed={selected===p.id} onClick={()=>select(p)}><strong>{p.name}</strong><span>{p.neighborhood || p.city}</span>{p.cuisine.length>0 && <small>{p.cuisine.join(' · ')}</small>}</button>)}</section></div>
    {active && <section className="spot-detail" aria-label={`Fiche ${active.name}`}><button className="spot-detail__close" onClick={()=>setSelected(null)} aria-label="Fermer la fiche">×</button><p className="eyebrow">LA FICHE</p><h2>{active.name}</h2><p>{active.descriptive_address || active.neighborhood || active.city}</p>{active.cuisine.length>0 && <p>{active.cuisine.join(' · ')}</p>}<p className="muted">Les horaires, tarifs et disponibilités sont à confirmer auprès du lieu.</p></section>}
  </main>;
}
