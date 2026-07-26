// Couche données B2B (espace lieux) — /pro/dashboard.
// Décisions :
//  - les VUES SQL de stats (b2b_place_stats_monthly, b2b_place_funnel) sont un
//    CHANTIER PARALLÈLE : les requêtes sont prêtes ci-dessous, et tout échec
//    « vue absente » (HTTP 404 ou code PostgREST/PG 42P01) retombe sur un état
//    { available: false, reason: "not_ready" } que l'UI affiche proprement
//    (« stats en construction ») au lieu de casser.
//  - RLS « own rows » partout : le token du spawter suffit, aucun filtre
//    place_id côté client n'est nécessaire (mais on le passe quand même pour
//    documenter l'intention et rester correct si la policy s'élargit).

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { ApiError } from "./api";

type FetchImpl = typeof fetch;

export interface B2bAccount {
  place_id: string;
  role: string;
}

export type B2bDataResult<T> =
  | { available: true; rows: T[] }
  | { available: false; reason: "not_ready" | "error" | "session_expired" };

function restHeaders(accessToken: string): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    authorization: `Bearer ${accessToken}`,
    accept: "application/json",
  };
}

/** Une réponse « relation absente » = la vue/table n'est pas encore déployée. */
async function isMissingRelation(resp: Response): Promise<boolean> {
  if (resp.status === 404) return true;
  try {
    const body = (await resp.clone().json()) as { code?: string };
    return body?.code === "42P01"; // PostgreSQL : undefined_table
  } catch {
    return false;
  }
}

/**
 * Détecte le compte B2B du spawter connecté.
 * GET /rest/v1/b2b_accounts?select=place_id,role&limit=1  (RLS own)
 * → null si aucun compte relié (l'UI propose alors le mailto).
 */
export async function fetchB2bAccount(
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<B2bAccount | null> {
  let resp: Response;
  try {
    resp = await fetchImpl(`${SUPABASE_URL}/rest/v1/b2b_accounts?select=place_id,role&limit=1`, {
      headers: restHeaders(accessToken),
    });
  } catch {
    throw new ApiError(0, "network_error");
  }
  if (resp.status === 401) throw new ApiError(401, "session_expired");
  if (!resp.ok) {
    // Table pas encore déployée → même traitement qu'« aucun compte relié ».
    if (await isMissingRelation(resp)) return null;
    throw new ApiError(resp.status, `http_${resp.status}`);
  }
  const rows = (await resp.json()) as B2bAccount[];
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

/** Fetch générique d'une vue de stats avec fallback « vue absente ». */
async function fetchStatsView<T>(
  path: string,
  accessToken: string,
  fetchImpl: FetchImpl,
): Promise<B2bDataResult<T>> {
  let resp: Response;
  try {
    resp = await fetchImpl(`${SUPABASE_URL}${path}`, { headers: restHeaders(accessToken) });
  } catch {
    return { available: false, reason: "error" };
  }
  if (resp.status === 401) return { available: false, reason: "session_expired" };
  if (!resp.ok) {
    return { available: false, reason: (await isMissingRelation(resp)) ? "not_ready" : "error" };
  }
  const rows = (await resp.json()) as unknown;
  return { available: true, rows: Array.isArray(rows) ? (rows as T[]) : [] };
}

/** Ligne mensuelle agrégée (schéma indicatif — la vue est en chantier). */
export interface PlaceMonthlyStats {
  [key: string]: unknown;
}

/**
 * Stats mensuelles du lieu (vue `b2b_place_stats_monthly` — chantier parallèle).
 * Requête cible :
 *   GET /rest/v1/b2b_place_stats_monthly
 *       ?select=month,spawts_count,unique_spawters,avis_count,note_moyenne
 *       &place_id=eq.{placeId}&order=month.desc&limit=12
 */
export function fetchPlaceMonthlyStats(
  placeId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<B2bDataResult<PlaceMonthlyStats>> {
  const path =
    `/rest/v1/b2b_place_stats_monthly?select=*` +
    `&place_id=eq.${encodeURIComponent(placeId)}&order=month.desc&limit=12`;
  return fetchStatsView<PlaceMonthlyStats>(path, accessToken, fetchImpl);
}

/** Étape de funnel découverte → venue (schéma indicatif — vue en chantier). */
export interface PlaceFunnelStep {
  [key: string]: unknown;
}

/**
 * Funnel du lieu (vue `b2b_place_funnel` — chantier parallèle).
 * Requête cible :
 *   GET /rest/v1/b2b_place_funnel
 *       ?select=step,count&place_id=eq.{placeId}&order=step.asc
 */
export function fetchPlaceFunnel(
  placeId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<B2bDataResult<PlaceFunnelStep>> {
  const path = `/rest/v1/b2b_place_funnel?select=*&place_id=eq.${encodeURIComponent(placeId)}&order=step.asc`;
  return fetchStatsView<PlaceFunnelStep>(path, accessToken, fetchImpl);
}
