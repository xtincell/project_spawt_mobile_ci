export type PublicPlace = { id: string; name: string; cuisine: string[]; lat: number | null; lng: number | null; neighborhood: string; descriptive_address: string; city: string };
export function parsePublicPlaces(rows: unknown): PublicPlace[] {
  if (!Array.isArray(rows)) throw new Error('Réponse invalide');
  return rows.filter((r): r is Record<string, unknown> => !!r && typeof r === 'object' && r.is_published === true && r.city_code === 'abidjan' && typeof r.id === 'string' && typeof r.name === 'string').map(r => ({
    id: String(r.id), name: String(r.name), cuisine: Array.isArray(r.cuisine) ? r.cuisine.filter((v): v is string => typeof v === 'string') : [],
    lat: typeof r.lat === 'number' && r.lat >= -90 && r.lat <= 90 ? r.lat : null,
    lng: typeof r.lng === 'number' && r.lng >= -180 && r.lng <= 180 ? r.lng : null,
    neighborhood: typeof r.neighborhood === 'string' ? r.neighborhood : '', descriptive_address: typeof r.descriptive_address === 'string' ? r.descriptive_address : '', city: typeof r.city === 'string' ? r.city : 'Abidjan',
  }));
}
export async function loadPublicPlaces(signal: AbortSignal): Promise<PublicPlace[]> {
  const response = await fetch('/data/places-public.json', {signal});
  if (!response.ok) throw new Error('Les adresses ne sont pas disponibles.');
  return parsePublicPlaces(await response.json());
}
