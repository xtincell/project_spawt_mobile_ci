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
