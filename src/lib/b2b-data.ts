// Couche données B2B (espace lieux) — /pro/dashboard.
// Branchée sur les VRAIES vues/tables des migrations 0042 + 0043 (repo app) :
//
//   - b2b_accounts(auth_user_id, place_id, role 'pro'|'gold', is_active…)
//     RLS own : le token du compte connecté suffit (auth_user_id = auth.uid()).
//   - Vue b2b_place_stats_monthly(place_id, month, spawts_verifies, avis,
//     note_moyenne_ponderee) — agrégats mensuels du lieu, chaque valeur est
//     NULL sous 3 événements (anti-réidentification : l'UI affiche « — » avec
//     une infobulle, jamais un zéro qui mentirait).
//   - Vue b2b_place_funnel(place_id, month, views, saves, shares, spawts) —
//     RÉSERVÉE au role 'gold' (gate is_b2b_gold_of PAR LIGNE) : un compte
//     'pro' reçoit une liste VIDE, pas une erreur. On ne l'appelle donc que
//     pour un compte gold ; côté pro, l'UI montre l'upsell Spawt Gold.
//   - reservation_requests(party_size, slot_at, channel, status…) — la policy
//     reservation_requests_select_b2b (0043) donne la LECTURE au B2B du lieu.
//     Aucune policy UPDATE pour le B2B (0042 : update = spawter uniquement) →
//     le portail est en lecture seule sur les statuts, et le dit.
//   - Avis individuels : la RLS 0021 (spawt_checkin_select_published_reviews)
//     ouvre la lecture des avis PUBLIÉS (note non-nulle, non supprimés) à
//     authenticated + anon — le compte B2B lit donc les mêmes avis publics
//     que n'importe qui dans l'app. Ce n'est pas un contournement : on
//     réplique exactement le filtre de la policy (et le join spawters_public
//     de la Story 4.9 pour le nom d'affichage, sans PII).
//
// Conventions du portail (identiques à entitlement.ts / invoices.ts) :
//  - fetch natif + fetchImpl injectable (tests via src/test/fetch-stub.ts),
//    pas de supabase.from() — le client supabase-js ne sert qu'à l'auth.
//  - dégradation propre si vue absente (HTTP 404 ou code PG 42P01) : le
//    portail peut être déployé AVANT la base migrée → { available: false,
//    reason: "not_ready" } et l'UI affiche « stats en construction ».

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { ApiError } from "./api";

type FetchImpl = typeof fetch;

// ── Compte B2B ────────────────────────────────────────────────────

export interface B2bAccount {
  place_id: string;
  role: string;
}

/** Le tier gold débloque le funnel (vue b2b_place_funnel, gate SQL 0043). */
export function isGoldAccount(account: Pick<B2bAccount, "role">): boolean {
  return account.role === "gold";
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
 * Détecte le compte B2B du lieu pour la session connectée.
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

/** Fetch générique d'une liste PostgREST avec fallback « relation absente ». */
async function fetchRestList<T>(
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

// ── Stats mensuelles (roles pro + gold) ───────────────────────────

/**
 * Ligne mensuelle de la vue b2b_place_stats_monthly (migration 0043).
 * `month` arrive en date PostgREST « 2026-07-01 » ; chaque compteur est NULL
 * sous 3 événements dans le mois (seuil anti-réidentification).
 */
export interface PlaceMonthlyStats {
  month: string;
  spawts_verifies: number | null;
  avis: number | null;
  note_moyenne_ponderee: number | null;
}

/**
 * Stats mensuelles du lieu.
 * GET /rest/v1/b2b_place_stats_monthly
 *     ?select=month,spawts_verifies,avis,note_moyenne_ponderee
 *     &place_id=eq.{placeId}&order=month.desc&limit=12
 * Le filtre place_id est redondant avec le gate SQL (is_b2b_of par ligne)
 * mais documente l'intention et reste correct si la policy s'élargit.
 */
export function fetchPlaceMonthlyStats(
  placeId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<B2bDataResult<PlaceMonthlyStats>> {
  const path =
    `/rest/v1/b2b_place_stats_monthly?select=month,spawts_verifies,avis,note_moyenne_ponderee` +
    `&place_id=eq.${encodeURIComponent(placeId)}&order=month.desc&limit=12`;
  return fetchRestList<PlaceMonthlyStats>(path, accessToken, fetchImpl);
}

// ── Funnel signaux (role gold uniquement) ─────────────────────────

/**
 * Ligne mensuelle de la vue b2b_place_funnel (migration 0043, GOLD only).
 * Étapes depuis user_signals : vues de fiche → sauvegardes → partages →
 * spawts. NULL sous 3 événements (même seuil que les stats).
 */
export interface PlaceFunnelMonth {
  month: string;
  views: number | null;
  saves: number | null;
  shares: number | null;
  spawts: number | null;
}

/**
 * Funnel du lieu — À N'APPELER QUE POUR UN COMPTE GOLD (isGoldAccount) :
 * pour un compte pro, le gate SQL is_b2b_gold_of rend la vue VIDE (pas une
 * erreur), l'UI doit donc montrer l'upsell sans requête inutile.
 * GET /rest/v1/b2b_place_funnel?select=month,views,saves,shares,spawts
 *     &place_id=eq.{placeId}&order=month.desc&limit=12
 */
export function fetchPlaceFunnel(
  placeId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<B2bDataResult<PlaceFunnelMonth>> {
  const path =
    `/rest/v1/b2b_place_funnel?select=month,views,saves,shares,spawts` +
    `&place_id=eq.${encodeURIComponent(placeId)}&order=month.desc&limit=12`;
  return fetchRestList<PlaceFunnelMonth>(path, accessToken, fetchImpl);
}

// ── Demandes de réservation 1-tap ─────────────────────────────────

/** Demande de réservation 1-tap venue de l'app (migration 0042). */
export interface ReservationRequest {
  id: string;
  party_size: number;
  slot_at: string | null;
  channel: string;
  status: string;
  created_at: string;
}

/**
 * Demandes de réservation du lieu, récentes d'abord.
 * GET /rest/v1/reservation_requests
 *     ?select=id,party_size,slot_at,channel,status,created_at
 *     &place_id=eq.{placeId}&order=created_at.desc&limit=50
 * Lecture via reservation_requests_select_b2b (0043). PAS d'update côté
 * portail : la policy UPDATE de 0042 est réservée au spawter — le statut
 * affiché est celui tenu à jour dans l'app.
 */
export function fetchReservationRequests(
  placeId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<B2bDataResult<ReservationRequest>> {
  const path =
    `/rest/v1/reservation_requests?select=id,party_size,slot_at,channel,status,created_at` +
    `&place_id=eq.${encodeURIComponent(placeId)}&order=created_at.desc&limit=50`;
  return fetchRestList<ReservationRequest>(path, accessToken, fetchImpl);
}

// ── Avis publics du lieu ──────────────────────────────────────────

/**
 * Avis publié, tel que l'app publique le montre (RLS 0021). Le join
 * spawters_public ne remonte que des colonnes safe (jamais de PII).
 */
export interface PlaceReview {
  id: string;
  note_etoiles: number;
  texte_avis: string | null;
  created_at: string;
  spawters_public: { display_name: string | null; stade: string | null } | null;
}

/**
 * Avis publics du lieu, récents d'abord.
 * GET /rest/v1/spawt_checkin
 *     ?select=id,note_etoiles,texte_avis,created_at,
 *             spawters_public!inner(display_name,stade)
 *     &place_id=eq.{placeId}&note_etoiles=not.is.null&deleted_at=is.null
 *     &is_seed=eq.false&order=created_at.desc&limit=30
 * Filtres alignés sur la policy 0021 (note non-nulle + non supprimé) ; on
 * exclut en plus les seeds pour rester cohérent avec les agrégats de
 * b2b_place_stats_monthly (qui les excluent aussi).
 */
export function fetchPlaceReviews(
  placeId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<B2bDataResult<PlaceReview>> {
  const path =
    `/rest/v1/spawt_checkin?select=id,note_etoiles,texte_avis,created_at,` +
    `spawters_public!inner(display_name,stade)` +
    `&place_id=eq.${encodeURIComponent(placeId)}&note_etoiles=not.is.null` +
    `&deleted_at=is.null&is_seed=eq.false&order=created_at.desc&limit=30`;
  return fetchRestList<PlaceReview>(path, accessToken, fetchImpl);
}

// ── Fiche du lieu (nom public) ────────────────────────────────────

export interface PlaceInfo {
  name: string;
  neighborhood: string | null;
}

/**
 * Nom public du lieu pour l'en-tête du dashboard.
 * GET /rest/v1/places?select=name,neighborhood&id=eq.{placeId}&limit=1
 * (policy places_select_published — lisible par tous les authenticated).
 * → null si non trouvé/non publié : l'UI retombe sur l'identifiant court.
 */
export async function fetchPlaceInfo(
  placeId: string,
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<PlaceInfo | null> {
  const result = await fetchRestList<PlaceInfo>(
    `/rest/v1/places?select=name,neighborhood&id=eq.${encodeURIComponent(placeId)}&limit=1`,
    accessToken,
    fetchImpl,
  );
  if (!result.available || result.rows.length === 0) return null;
  const row = result.rows[0];
  return typeof row?.name === "string" ? row : null;
}

// ── Helpers d'affichage (purs, testés unitairement) ───────────────

/** Seuil anti-réidentification des vues 0043 : sous 3 événements → NULL. */
export const SEUIL_ANONYMAT = 3;

/** Clé mois façon PostgREST (« 2026-07-01 ») pour une date donnée. */
export function monthKey(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

/** Les n dernières clés de mois, la plus récente d'abord. */
export function lastMonthKeys(n: number, from: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i += 1) {
    keys.push(monthKey(new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - i, 1))));
  }
  return keys;
}

/** Libellé FR d'une clé mois : « juillet 2026 ». */
export function formatMonthFr(key: string): string {
  const d = new Date(`${key}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return key;
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
}

/**
 * Valeur d'agrégat pour l'affichage : nombre FR, ou « — » quand la vue a
 * rendu NULL (seuil n<3 — l'UI accompagne le tiret d'une infobulle).
 */
export function formatStatValue(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(value);
}

/** Ligne d'un mois donné dans une série mensuelle (ou null si absente). */
export function findMonthRow<T extends { month: string }>(rows: T[], key: string): T | null {
  return rows.find((r) => r.month === key) ?? null;
}

/** Nombre de demandes de réservation créées dans le mois donné. */
export function countReservationsInMonth(rows: ReservationRequest[], key: string): number {
  return rows.filter((r) => typeof r.created_at === "string" && monthKey(new Date(r.created_at)) === key)
    .length;
}
