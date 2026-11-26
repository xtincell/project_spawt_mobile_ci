import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Map as CityMap, Marker } from 'maplibre-gl';
import { loadPublicPlaces, type PublicPlace } from '../lib/public-places';
import { PublicPlaceSheet } from '../components/PublicPlaceSheet';
function reveal(element: HTMLElement | null, block: ScrollLogicalPosition) {
  if (!element) return;
  element.focus({preventScroll: true});
  element.scrollIntoView({behavior: 'instant', block});
}
export default function MapPage() {
  const [searchParams] = useSearchParams();
  const requestedPlace = searchParams.get('lieu')?.trim() || null;
  const requestedQuery = searchParams.get('q') || '';
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<{ instance: CityMap; Marker: typeof Marker } | null>(null);
  const detail = useRef<HTMLElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const resolvedTarget = useRef<string | null>(null);
  const pendingDetailFocus = useRef<string | null>(null);
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [query, setQuery] = useState(requestedQuery);
  const [selected, setSelected] = useState<string | null>(null);
  const [missingLinkedPlace, setMissingLinkedPlace] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [mapUnavailable, setMapUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const filtered = useMemo(() => places.filter(p => `${p.name} ${p.neighborhood} ${p.cuisine.join(' ')}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))), [places, query]);
  const active = places.find(p => p.id === selected);
  useEffect(() => setQuery(requestedQuery), [requestedQuery]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true); setError(false);
    loadPublicPlaces(controller.signal).then(setPlaces).catch(e => {if (e.name !== 'AbortError') setError(true);}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let cancelled = false;
    let instance: CityMap | undefined;
    async function initialize(element: HTMLDivElement) {
      try {
        const context = typeof WebGL2RenderingContext === 'function' && document.createElement('canvas').getContext('webgl2');
        if (!context) throw new Error('WebGL indisponible');
        context.getExtension('WEBGL_lose_context')?.loseContext();
        const engine = await import('../lib/interactive-map');
        if (cancelled) return;
        instance = new engine.Map({container: element, style: 'https://tiles.openfreemap.org/styles/dark', center: [-4.0267,5.3364], zoom: 11, attributionControl: {compact: true}});
        instance.addControl(new engine.NavigationControl(), 'top-right');
        instance.on('error', () => { if (!cancelled) setMapError(true); });
        instance.on('load', () => { if (!cancelled) setMapError(false); });
        setMap({ instance, Marker: engine.Marker });
      } catch {
        if (!cancelled) { setMapUnavailable(true); setMapError(true); }
      }
    }
    void initialize(element);
    return () => { cancelled = true; instance?.remove(); };
  }, []);
  useEffect(() => {
    if (loading || error) return;
    const target = `${attempt}:${requestedPlace ?? ''}`;
    if (resolvedTarget.current === target) return;
    resolvedTarget.current = target;
    const linkedPlace = requestedPlace ? places.find(p => p.id === requestedPlace) : undefined;
    setMissingLinkedPlace(!!requestedPlace && !linkedPlace);
    opener.current = null;
    setSelected(linkedPlace?.id ?? null);
    pendingDetailFocus.current = linkedPlace?.id ?? null;
  }, [requestedPlace, loading, error, places, attempt]);
  useEffect(() => {
    if (map && active?.lng != null && active.lat != null) map.instance.flyTo({center:[active.lng,active.lat],zoom:14,essential:false});
  }, [map, active]);
  useEffect(() => {
    if (!active || pendingDetailFocus.current !== active.id || !detail.current) return;
    pendingDetailFocus.current = null;
    reveal(detail.current, 'start');
  }, [active]);
  useEffect(() => {
    if (!map) return;
    const markers = filtered.filter(p => p.lat !== null && p.lng !== null).map(p => {
      const button = document.createElement('button'); button.type = 'button'; button.className = `spot-pin${selected === p.id ? ' spot-pin--active' : ''}`; button.setAttribute('aria-label', p.name); button.textContent = '●'; button.onclick = () => select(p, button);
      return new map.Marker({element: button}).setLngLat([p.lng!,p.lat!]).addTo(map.instance);
    });
    return () => markers.forEach(m => m.remove());
  }, [map, filtered, selected]);
  function select(p: PublicPlace, button: HTMLButtonElement) {
    opener.current = button;
    if (selected === p.id) {
      reveal(detail.current, 'start');
      return;
    }
    pendingDetailFocus.current = p.id;
    setSelected(p.id);
  }
  function closeDetail() {
    setSelected(null);
    const button = opener.current;
    // Selection redraws the native map pins; the matching catalogue button remains available.
    const target = button?.isConnected ? button : Array.from(document.querySelectorAll<HTMLButtonElement>('[data-spot-id]')).find(card => card.dataset.spotId === selected);
    reveal(target ?? search.current, 'center');
    opener.current = null;
  }
  return <main className="spot-explorer container">
    <header className="spot-explorer__heading"><p className="eyebrow">ABIDJAN · LES SPOTS</p><h1>Une adresse, un point sur la carte.</h1><p>Explorez les adresses actuellement publiées dans SPAWT. Sélectionnez une carte ou un repère pour voir la fiche. Les positions sont celles renseignées par SPAWT ; confirmez votre destination auprès du lieu.</p></header>
    <label className="spot-search">Chercher une adresse ou un quartier<input ref={search} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Kaiten, Zone 4…" type="search" /></label>
    {loading && <p role="status">Chargement des adresses…</p>}
    {error && <p role="alert">Les adresses sont indisponibles. <button onClick={()=>setAttempt(a=>a+1)}>Réessayer</button></p>}
    {!loading && !error && missingLinkedPlace && <p role="status">Ce lieu n’est pas disponible dans les adresses publiées. Tu peux explorer les autres spots ci-dessous.</p>}
    <div className={`spot-explorer__grid${mapUnavailable ? " spot-explorer__grid--list" : ""}`}><section aria-label="Carte des spots" className={`spot-map${mapUnavailable ? " spot-map--unavailable" : ""}`}><div ref={container} className="spot-map__canvas"/>{mapError && <p className="spot-map__notice">{mapUnavailable ? "Ce navigateur ne permet pas d’afficher la carte interactive. Retrouvez toutes les adresses dans les fiches ci-dessous." : "Le fond de carte est momentanément indisponible. Les fiches restent accessibles."}</p>}</section>
    <section className="spot-list" aria-label="Liste des spots"><p aria-live="polite">{filtered.length} adresse{filtered.length !== 1 ? 's' : ''} · {filtered.filter(p => p.lat !== null && p.lng !== null).length} sur la carte</p>{!loading && !error && filtered.length === 0 && <p>Aucune adresse pour cette recherche.</p>}{filtered.map(p=><button key={p.id} data-spot-id={p.id} className={`spot-card${selected===p.id?' spot-card--active':''}`} aria-pressed={selected===p.id} onClick={event=>select(p, event.currentTarget)}><strong>{p.name}</strong><span>{p.neighborhood || p.city}</span>{p.cuisine.length>0 && <small>{p.cuisine.join(' · ')}</small>}</button>)}</section></div>
    {active && <PublicPlaceSheet key={active.id} place={active} detailRef={detail} onClose={closeDetail} />}
  </main>;
}
