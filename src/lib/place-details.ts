import backend from './public-backend.json';

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const strings = (value: unknown) => [...new Set(list(value).map(text).filter(Boolean))];

function webUrl(value: unknown) {
  try {
    const url = new URL(text(value));
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function phone(value: unknown) {
  const normalized = text(value).replace(/[\s().-]/g, '');
  if (/^\+225\d{10}$/.test(normalized)) return normalized;
  return /^0\d{9}$/.test(normalized) ? '+225' + normalized : null;
}

export const week = { mon: 'Lundi', tue: 'Mardi', wed: 'Mercredi', thu: 'Jeudi', fri: 'Vendredi', sat: 'Samedi', sun: 'Dimanche' };
const clock = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function openingHours(input: unknown) {
  const result: { day: string; intervals: { open: string; close: string }[] }[] = [];
  const raw = record(input);
  for (const [key, day] of Object.entries(week)) {
    if (!Array.isArray(raw[key])) continue;
    const slots = list(raw[key]);
    const intervals = slots.flatMap(value => {
      const { open, close } = record(value);
      return typeof open === 'string' && clock.test(open) && typeof close === 'string' && clock.test(close) ? [{ open, close }] : [];
    });
    if (intervals.length || !slots.length) result.push({ day, intervals });
  }
  return result;
}

function money(value: unknown) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
}

export function parsePlaceContact(input: unknown) {
  const r = record(input);
  const cover = webUrl(r.cover_photo_url);
  const tier = r.price_tier;
  return {
    phone: phone(r.phone), whatsapp: phone(r.whatsapp),
    ticket: money(r.avg_ticket_xof), tier: tier === 1 || tier === 2 || tier === 3 ? tier : null,
    hours: openingHours(r.hours), menus: [...new Set(list(r.menu_urls).map(webUrl).filter((s): s is string => !!s))],
    cover: cover?.startsWith(backend.url + '/storage/v1/object/public/place-covers/') ? cover : null,
    editorial: parseEditorial(r.editorial_profile),
  };
}

function dated(value: unknown) {
  const date = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const parsed = new Date(date + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().startsWith(date) ? date : null;
}

function parseEditorial(input: unknown) {
  const doc = record(input), identity = text(doc.identity), checkedOn = dated(doc.verified_on);
  if (!identity || !checkedOn) return null;
  const sections = list(doc.sections).flatMap(item => {
    const section = record(item), title = text(section.title), body = text(section.body);
    return title && body ? [{ title, body }] : [];
  });
  return { identity, checkedOn, sections };
}

export function parsePractical(input: unknown) {
  const r = record(input);
  const email = text(r.contact_email);
  const links = (value: unknown) => list(value).flatMap(item => {
    const obj = record(item), url = webUrl(obj.url), label = text(obj.label);
    return url && label ? [{ url, label, date: dated(obj.checked_on), fields: strings(obj.fields) }] : [];
  });
  const maps = webUrl(r.google_maps_url);
  return { website: webUrl(r.website_url), maps: maps && /^https:\/\/(?:maps\.app\.goo\.gl\/|maps\.google\.com\/|(?:www\.)?google\.com\/maps(?:\/|\?|$)|goo\.gl\/maps\/)/.test(maps) ? maps : null,
    email: /^[^\s@?#]+@[^\s@?#]+\.[^\s@?#]+$/.test(email) ? email : null,
    description: text(r.official_description), socials: links(r.social_links), services: strings(r.services),
    payments: strings(r.payment_methods), sources: links(r.sources) };
}

export function parseReviewStats(input: unknown) {
  const row = record(input), count = row.review_count;
  if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 1) return null;
  const ratings = Object.entries({ Cuisine: row.cuisine_avg, Cadre: row.cadre_avg, Service: row.service_avg })
    .flatMap(([name, value]) => typeof value === 'number' && value >= 1 && value <= 5 ? [{ name, value }] : []);
  const bins = list(row.histogram);
  const histogram = bins.length === 5 && bins.every((v): v is number => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0)
    && bins.reduce((a, b) => a + b, 0) === count ? bins : null;
  return { count, ratings, histogram };
}

export function parseMenu(input: unknown, place: string) {
  return list(input).flatMap(item => {
    const row = record(item), name = text(row.name);
    if (row.place_id !== place || row.is_published !== true || !name || !text(row.id)) return [];
    return [{ id: text(row.id), name, price: money(row.price_xof), source: webUrl(row.source_url), date: dated(row.observed_on) }];
  });
}

async function read(table: string, query: Record<string, string>, signal: AbortSignal) {
  const res = await fetch(`${backend.url}/rest/v1/${table}?${new URLSearchParams(query)}`, {
    signal, credentials: 'omit', cache: 'no-store', headers: { apikey: backend.anonKey, Authorization: `Bearer ${backend.anonKey}` },
  });
  if (res.status === 404 && (table === 'public_place_practical' || table === 'public_place_review_stats')) {
    const error = await res.json().catch(() => null);
    if (error?.code === 'PGRST205') return [];
  }
  if (!res.ok) throw new Error('Informations indisponibles');
  const rows: unknown = await res.json();
  if (!Array.isArray(rows)) throw new Error('Réponse invalide');
  return rows;
}

export async function loadPlaceContact(id: string, signal: AbortSignal) {
  const rows = await read('places', { select: 'id,phone,whatsapp,avg_ticket_xof,price_tier,hours,menu_urls,cover_photo_url,editorial_profile',
    id: 'eq.' + id, city_code: 'eq.abidjan', is_published: 'eq.true', limit: '1' }, signal);
  return parsePlaceContact(rows.find(row => row?.id === id));
}

export async function loadPractical(id: string, signal: AbortSignal) {
  const rows = await read('public_place_practical', { select: 'place_id,website_url,google_maps_url,contact_email,social_links,services,payment_methods,official_description,sources',
    place_id: 'eq.' + id, limit: '1' }, signal);
  return parsePractical(rows.find(row => row?.place_id === id));
}

export async function loadReviewStats(id: string, signal: AbortSignal) {
  const rows = await read('public_place_review_stats', { select: 'place_id,review_count,cuisine_avg,cadre_avg,service_avg,histogram',
    place_id: 'eq.' + id, limit: '1' }, signal);
  return parseReviewStats(rows.find(row => row?.place_id === id));
}

export async function loadPlaceMenu(id: string, signal: AbortSignal) {
  return parseMenu(await read('public_menu_items', { select: 'id,name,place_id,price_xof,source_url,observed_on,is_published',
    place_id: 'eq.' + id, is_published: 'eq.true', order: 'name,id' }, signal), id);
}
