// Stub fetch pour les tests — remplace MSW (plus léger, zéro dépendance).
// Fournit un routeur minimal + des réponses prêtes à l'emploi qui respectent
// les contrats des Edge Functions (otp-send, otp-verify, payment-checkout)
// et de PostgREST (active_entitlements, invoices, b2b_*).

import { vi } from "vitest";

export interface RecordedCall {
  url: string;
  init?: RequestInit;
  body: unknown;
}

export interface StubRoute {
  /** Sous-chaîne d'URL à matcher (ex. "otp-send", "active_entitlements"). */
  urlIncludes: string;
  /** Réponse(s) : une seule (répétée) ou une file (une par appel). */
  respond: (call: RecordedCall) => Response;
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/**
 * Construit un fetch stubbé + journal des appels.
 * Tout appel non matché échoue le test (contrat : on stubbe TOUT le réseau).
 */
export function makeFetchStub(routes: StubRoute[]) {
  const calls: RecordedCall[] = [];
  const impl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    let body: unknown = null;
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }
    const call: RecordedCall = { url, init, body };
    calls.push(call);
    const route = routes.find((r) => url.includes(r.urlIncludes));
    if (!route) throw new Error(`fetch non stubbé : ${url}`);
    return route.respond(call);
  });
  return { impl: impl as unknown as typeof fetch, calls, mock: impl };
}

/** File de réponses : la n-ième réponse pour le n-ième appel de la route. */
export function respondQueue(...responses: Array<() => Response>): (call: RecordedCall) => Response {
  let i = 0;
  return () => {
    const factory = responses[Math.min(i, responses.length - 1)];
    i += 1;
    return factory();
  };
}

// ── Réponses contractuelles prêtes à l'emploi ─────────────────────

/** otp-send : succès mock (aligné supabase/functions/otp-send). */
export const otpSendOk = () => jsonResponse({ success: true, request_id: `mock-${Date.now()}` });

/** otp-send : rate limit téléphone (429). */
export const otpSendRateLimited = () =>
  jsonResponse({ error: "rate_limited", scope: "phone", retry_after_seconds: 3600 }, 429);

/** otp-verify : succès (format EXACT de supabase/functions/otp-verify). */
export const otpVerifyOk = (userId = "11111111-2222-3333-4444-555555555555") =>
  jsonResponse({
    success: true,
    user_id: userId,
    access_token: "jeton-acces-test",
    refresh_token: "jeton-refresh-test",
  });

/** otp-verify : code invalide (401). */
export const otpVerifyInvalid = () => jsonResponse({ error: "invalid_otp" }, 401);

/** payment-checkout : succès (contrat documenté dans lib/api.ts). */
export const checkoutOk = (transactionId = "txn-test-001") =>
  jsonResponse({
    payment_url: `https://checkout.cinetpay.example/${transactionId}`,
    transaction_id: transactionId,
  });

/** payment-checkout : session expirée (401). */
export const checkoutExpired = () => jsonResponse({ error: "session_expired" }, 401);

/** payment-checkout : déjà Gold (409). */
export const checkoutAlreadyActive = () => jsonResponse({ error: "already_active" }, 409);

/** payment-checkout : prestataire indisponible (502). */
export const checkoutProviderError = () => jsonResponse({ error: "provider_error" }, 502);

/** active_entitlements : réponses PostgREST. */
export const entitlementsEmpty = () => jsonResponse([]);
export const entitlementsActive = () =>
  jsonResponse([{ product: "gold", status: "active", expires_at: new Date(Date.now() + 86_400_000).toISOString() }]);

// ── Espace lieux (B2B) : b2b_accounts, vues 0043, résas, avis ─────

export const PLACE_ID_TEST = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

export const b2bAccountPro = () => jsonResponse([{ place_id: PLACE_ID_TEST, role: "pro" }]);
export const b2bAccountGold = () => jsonResponse([{ place_id: PLACE_ID_TEST, role: "gold" }]);
export const b2bAccountNone = () => jsonResponse([]);

/** PostgREST : relation absente (PostgREST moderne → 404 + code PGRST205). */
export const relationMissing404 = () =>
  jsonResponse({ code: "PGRST205", message: "Could not find the table in the schema cache" }, 404);

/** PostgREST : relation absente (variante 400 + code PostgreSQL 42P01). */
export const relationMissing42P01 = () =>
  jsonResponse({ code: "42P01", message: "relation does not exist" }, 400);

/** Clé mois PostgREST (« 2026-07-01 ») décalée de `offset` mois avant le mois courant. */
export function moisKey(offset: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * b2b_place_stats_monthly : mois courant fourni, mois -1 sous le seuil n<3
 * (tout NULL — la vue 0043 masque les agrégats), mois -2 fourni.
 */
export const b2bMonthlyStats = () =>
  jsonResponse([
    { month: moisKey(0), spawts_verifies: 12, avis: 5, note_moyenne_ponderee: 4.2 },
    { month: moisKey(1), spawts_verifies: null, avis: null, note_moyenne_ponderee: null },
    { month: moisKey(2), spawts_verifies: 7, avis: 3, note_moyenne_ponderee: 3.8 },
  ]);

/** b2b_place_funnel (role gold) : shares du mois courant sous le seuil → NULL. */
export const b2bFunnelRows = () =>
  jsonResponse([
    { month: moisKey(0), views: 240, saves: 58, shares: null, spawts: 21 },
    { month: moisKey(1), views: 180, saves: 40, shares: 12, spawts: 15 },
  ]);

/** reservation_requests : 2 demandes du mois courant + 1 du mois précédent. */
export const b2bReservations = () =>
  jsonResponse([
    {
      id: "resa-3",
      party_size: 4,
      slot_at: `${moisKey(0).slice(0, 8)}15T20:30:00Z`,
      channel: "whatsapp",
      status: "confirmed",
      created_at: `${moisKey(0).slice(0, 8)}12T10:00:00Z`,
    },
    {
      id: "resa-2",
      party_size: 2,
      slot_at: null,
      channel: "phone",
      status: "sent",
      created_at: `${moisKey(0).slice(0, 8)}05T18:00:00Z`,
    },
    {
      id: "resa-1",
      party_size: 6,
      slot_at: `${moisKey(1).slice(0, 8)}20T19:00:00Z`,
      channel: "whatsapp",
      status: "cancelled",
      created_at: `${moisKey(1).slice(0, 8)}18T09:00:00Z`,
    },
  ]);

/** spawt_checkin (avis publiés, RLS 0021) avec le join spawters_public. */
export const b2bReviews = () =>
  jsonResponse([
    {
      id: "avis-1",
      note_etoiles: 5,
      texte_avis: "Le poisson braisé est une claque. On revient dimanche.",
      created_at: `${moisKey(0).slice(0, 8)}10T19:00:00Z`,
      spawters_public: { display_name: "Awa", stade: "djidji" },
    },
    {
      id: "avis-2",
      note_etoiles: 4,
      texte_avis: null,
      created_at: `${moisKey(1).slice(0, 8)}22T13:00:00Z`,
      spawters_public: { display_name: "Karim", stade: "explorateur" },
    },
  ]);

/** places (fiche publique) : nom + quartier du lieu relié. */
export const placeInfoRow = () =>
  jsonResponse([{ name: "Chez Tantie Alice", neighborhood: "Cocody" }]);
