import { useEffect, useState, type RefObject, type ReactNode } from 'react';
import { loadPlaceContact, loadPlaceMenu, loadPractical, loadReviewStats } from '../lib/place-details';
import type { PublicPlace } from '../lib/public-places';
import '../styles/place-sheet.css';

const currency = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 });
const dateFormat = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const cuisines: Record<string, string> = { europeenne: 'Européenne', ivoirienne: 'Ivoirienne', italienne: 'Italienne',
  francaise: 'Française', asiatique: 'Asiatique', libanaise: 'Libanaise', grillades: 'Grillades', burger_pizza: 'Burgers et pizzas',
  fusion: 'Fusion', ouest_africaine: 'Ouest-africaine', cafe: 'Café', patisserie: 'Pâtisserie', autre: 'Autre' };
const label = (value: string) => cuisines[value] || value.replaceAll('_', ' ');
const formatDate = (value: string) => dateFormat.format(new Date(value + 'T00:00:00Z'));
const sameTextKey = (value: string) => value.normalize().toLocaleLowerCase('fr').replace(/\s+/g, ' ').trim();

function usePlaceInfo<T>(load: (id: string, signal: AbortSignal) => Promise<T>, id: string, attempt: number, provided?: T, pending = false) {
  const [state, setState] = useState<{ value?: T; failed?: boolean }>({});
  useEffect(() => {
    if (provided !== undefined || pending) return;
    const controller = new AbortController();
    load(id, controller.signal).then(value => { if (!controller.signal.aborted) setState({ value }); })
      .catch(() => { if (!controller.signal.aborted) setState({ failed: true }); });
    return () => controller.abort();
  }, [load, id, attempt, provided, pending]);
  return provided !== undefined ? { value: provided, failed: false } : state;
}

function External({ url, children }: { url: string; children: ReactNode }) {
  return <a href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
}

function PublishedMenu({ items }: { items: Awaited<ReturnType<typeof loadPlaceMenu>> }) {
  if (!items.length) return null;
  const groups = new Map<string | null, typeof items>();
  for (const item of items) groups.set(item.source, [...(groups.get(item.source) || []), item]);
  return <div className="place-sheet__section"><h3>À la carte</h3>{Array.from(groups, ([source, dishes]) => {
    const isBrunch = source && /\/brunch-menu\/?$/i.test(new URL(source).pathname);
    const dates = new Set(dishes.map(dish => dish.date));
    const commonDate = dates.size === 1 ? dishes[0].date : null;
    const prices = dishes.flatMap(item => item.price === null ? [] : [item.price]);
    const low = Math.min(...prices), high = Math.max(...prices);
    return <details key={source || 'sans-source'} className="place-sheet__menu">
      <summary>{isBrunch ? 'Carte brunch' : 'Plats et tarifs'} <span>{dishes.length} article{dishes.length > 1 && 's'}</span></summary>
      {prices.length > 0 && <p className="place-sheet__note">{low === high ? 'Prix relevé' : 'Prix relevés'} · {currency.format(low)}{low !== high && ' à ' + currency.format(high)}</p>}
      <ul className="place-sheet__menu-list">{dishes.map(dish => <li key={dish.id}><span>{dish.name}
        {!commonDate && dish.date && <small>Relevé le {formatDate(dish.date)}</small>}</span>
        {dish.price !== null && <strong>{currency.format(dish.price)}</strong>}</li>)}</ul>
      {(source || commonDate) && <p className="place-sheet__note">{source && <External url={source}>Consulter le menu d’origine</External>}
        {source && commonDate && ' · '}{commonDate && 'Relevé le ' + formatDate(commonDate)}</p>}
    </details>;
  })}</div>;
}

export function PublicPlaceSheet({ place, detailRef, onClose, contactInfo, contactPending = false }: {
  place: PublicPlace; detailRef: RefObject<HTMLElement>; onClose: () => void; contactInfo?: Awaited<ReturnType<typeof loadPlaceContact>>; contactPending?: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const contact = usePlaceInfo(loadPlaceContact, place.id, attempt, contactInfo, contactPending);
  const practical = usePlaceInfo(loadPractical, place.id, attempt);
  const menu = usePlaceInfo(loadPlaceMenu, place.id, attempt);
  const reviews = usePlaceInfo(loadReviewStats, place.id, attempt);
  const c = contact.value, p = practical.value;
  const printed = new Set([sameTextKey(p?.description || '')]);
  const editorial = c?.editorial;
  const identity = editorial && !printed.has(sameTextKey(editorial.identity)) ? editorial.identity : null;
  if (identity) printed.add(sameTextKey(identity));
  const sections = editorial?.sections.filter(section => {
    const key = sameTextKey(section.body);
    if (printed.has(key)) return false;
    printed.add(key);
    return true;
  }) || [];
  const linkedMenus = new Map<string, string>();
  for (const source of p?.sources || []) {
    if (source.fields.includes('menu_urls')) linkedMenus.set(source.url, source.label);
  }
  for (const [index, url] of (c?.menus || []).entries()) {
    if (!linkedMenus.has(url)) linkedMenus.set(url, c!.menus.length === 1 ? 'Consulter le menu' : `Consulter le menu ${index + 1}`);
  }
  const [imageFailed, setImageFailed] = useState(false);
  const [shareState, setShareState] = useState<'ready' | 'copied' | 'manual'>('ready');
  const shareLink = new URL('/carte', window.location.origin);
  shareLink.searchParams.set('lieu', place.id);
  async function share() {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: place.name + ' · SPAWT', url: shareLink.href }); return; }
      catch (error) { if (error instanceof Error && error.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(shareLink.href); setShareState('copied'); }
    catch { setShareState('manual'); }
  }
  const hasPosition = place.lat !== null && place.lng !== null;
  const destination = hasPosition ? `${place.lat},${place.lng}` : place.descriptive_address ? [place.name, place.descriptive_address, place.city].filter(Boolean).join(', ') : null;
  return <section ref={detailRef} tabIndex={-1} className="spot-detail place-sheet" aria-label={`Fiche ${place.name}`}>
    <button className="spot-detail__close" onClick={onClose} aria-label="Fermer la fiche">×</button>
    <div className="place-sheet__head">
      <div><p className="place-sheet__locality">{[place.neighborhood, place.city].filter(Boolean).join(' · ')}</p>
        <h2>{place.name}</h2>{place.cuisine.length > 0 && <p>{place.cuisine.map(label).join(' · ')}</p>}</div>
      {c?.cover && !imageFailed && <img src={c.cover} alt={`Photo de ${place.name} dans le catalogue SPAWT`} width="800" height="430" decoding="async" onError={() => setImageFailed(true)} />}
    </div>
    <div className="place-sheet__body">
      {p?.description && <p className="place-sheet__intro">{p.description}</p>}
      {identity && <p className="place-sheet__intro">{identity}</p>}
      {place.descriptive_address && <address>{place.descriptive_address}</address>}
      {hasPosition && <p className="place-sheet__coordinates">GPS · {place.lat}, {place.lng}</p>}
      {!hasPosition && !place.descriptive_address && <p className="place-sheet__note">Adresse précise à confirmer.</p>}
      <div className="place-sheet__actions">
        {destination && <External url={'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(destination)}>Itinéraire</External>}
        {!destination && p?.maps && <External url={p.maps}>Ouvrir dans Maps</External>}
        {c?.phone && <a href={'tel:' + c.phone}>Appeler</a>}
        {c?.whatsapp && <External url={'https://wa.me/' + c.whatsapp.slice(1)}>WhatsApp</External>}
        {p?.website && <External url={p.website}>Site officiel</External>}
        <button onClick={share}>Partager la fiche</button>
      </div>
      {shareState === 'copied' && <p role="status" className="place-sheet__note">Lien de la fiche copié.</p>}
      {shareState === 'manual' && <label className="place-sheet__shared">Lien de la fiche<input value={shareLink.href} readOnly onFocus={event => event.currentTarget.select()} /></label>}
      {editorial && (identity || sections.length > 0) && <div className="place-sheet__section">
        {sections.map(section => <div key={section.body}><h3>{section.title}</h3><p>{section.body}</p></div>)}
        <p className="place-sheet__note">Rédaction SPAWT · Vérifié le {formatDate(editorial.checkedOn)}</p>
      </div>}
      {c && (c.ticket || c.tier) && <div className="place-sheet__section"><h3>Budget</h3>
        {c.ticket && <p>Ticket moyen indicatif · <strong>{currency.format(c.ticket)}</strong></p>}
        {c.tier && <p>Gamme de prix · {['Économique', 'Intermédiaire', 'Premium'][c.tier - 1]}</p>}</div>}
      {!!c?.hours.length && <details className="place-sheet__section"><summary>Horaires</summary>
        <dl className="place-sheet__hours">{c.hours.map(({ day, intervals }) => <div key={day}><dt>{day}</dt><dd>
          {intervals.length ? intervals.map(({ open, close }) => open + ' – ' + close + (close < open ? ' (lendemain)' : '')).join(' / ') : 'Fermé'}</dd></div>)}</dl></details>}
      {menu.value && <PublishedMenu items={menu.value} />}
      {linkedMenus.size > 0 && <div className="place-sheet__section"><h3>Menus du lieu</h3>
        <ul>{Array.from(linkedMenus, ([url, title]) => <li key={url}><External url={url}>{title}</External></li>)}</ul></div>}
      {p && (p.services.length > 0 || p.payments.length > 0) && <div className="place-sheet__section"><h3>{p.payments.length > 0 ? 'Services et paiements' : 'Services'}</h3>
        {p.services.length > 0 && <p>{p.services.join(' · ')}</p>}
        {p.payments.length > 0 && <p>Paiements acceptés · {p.payments.join(' · ')}</p>}</div>}
      {reviews.value && <details className="place-sheet__section"><summary>Avis de la Bande <span>({reviews.value.count})</span></summary>
        {reviews.value.ratings.map(r => <p key={r.name}>{r.name} · {r.value.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} / 5</p>)}
        {reviews.value.histogram && <ul className="place-sheet__distribution">{reviews.value.histogram.map((count, index) => <li key={index}>
          <span>{index + 1} / 5</span><meter min={0} max={reviews.value!.count} value={count} aria-label={`Nombre d’avis à ${index + 1} sur 5`} /><span>{count}</span></li>)}</ul>}
      </details>}
      {(c?.phone || p?.email || !!p?.socials.length || (destination && p?.maps)) && <div className="place-sheet__section"><h3>Coordonnées du lieu</h3>
        <ul>{c?.phone && <li><a href={'tel:' + c.phone}>{'+225 ' + c.phone.slice(4).match(/.{2}/g)?.join(' ')}</a></li>}
        {p?.email && <li><a href={'mailto:' + p.email}>{p.email}</a></li>}
        {destination && p?.maps && <li><External url={p.maps}>Adresse sur Google Maps</External></li>}
        {p?.socials.map(s => <li key={s.url}><External url={s.url}>{s.label}</External></li>)}</ul></div>}
      {!!p?.sources.length && <details className="place-sheet__section"><summary>Sources du lieu</summary>
        <ul>{p.sources.map(s => <li key={s.url + s.label}><External url={s.url}>{s.label}</External>
          {s.date && <span> · Vérifié le {formatDate(s.date)}</span>}</li>)}</ul></details>}
      {(contact.failed || practical.failed || menu.failed || reviews.failed) && <p className="place-sheet__note">Certaines informations sont indisponibles. <button onClick={() => setAttempt(value => value + 1)}>Réessayer</button></p>}
    </div>
  </section>;
}
