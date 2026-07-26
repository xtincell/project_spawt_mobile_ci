// Couche API du portail — appels typés vers les Edge Functions Supabase et
// erreurs contractuelles. Décisions :
//  - fetch natif (pas d'axios) ; chaque helper accepte un `fetchImpl` injectable
//    pour les tests (stub, cf. src/test/fetch-stub.ts).
//  - les erreurs remontent en ApiError {status, code} — les pages mappent le
//    code vers un message FR, jamais l'inverse.
//  - `payment-checkout` N'EXISTE PAS ENCORE côté backend (chantier parallèle) :
//    on code contre le contrat exact ci-dessous + mode démo VITE_PAYMENT_MOCK=1.
//
// Contrat payment-checkout (à implémenter côté supabase/functions) :
//   POST {SUPABASE_URL}/functions/v1/payment-checkout
//   Headers : Authorization: Bearer <access_token du spawter> · apikey: <anon>
//   Body    : {"plan":"gold_monthly"|"gold_annual","return_url":"<origin>/gold/retour"}
//   200 → {"payment_url":"https://checkout.cinetpay.com/...","transaction_id":"..."}
//   401 → session expirée (relogin) · 409 {"error":"already_active"} (déjà Gold)
//   502 {"error":"provider_error"} (CinetPay indisponible → réessayer)

import { SUPABASE_URL, SUPABASE_ANON_KEY, isPaymentMock } from "./config";

/** Erreur contractuelle : status HTTP + code machine stable. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfterSeconds?: number;

  constructor(status: number, code: string, message?: string, retryAfterSeconds?: number) {
    super(message ?? code);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

type FetchImpl = typeof fetch;

/** Extrait un code d'erreur stable d'un body Edge ({error:"x"} ou {error:{code}}). */
function extractErrorCode(body: unknown, fallback: string): string {
  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error: unknown }).error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object" && "code" in err) {
      const code = (err as { code: unknown }).code;
      if (typeof code === "string") return code;
    }
  }
  return fallback;
}

async function edgePost<T>(
  fn: string,
  body: unknown,
  bearerToken: string,
  fetchImpl: FetchImpl,
): Promise<T> {
  let resp: Response;
  try {
    resp = await fetchImpl(`${SUPABASE_URL}/functions/v1/${fn}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "network_error");
  }

  let json: unknown = null;
  try {
    json = await resp.json();
  } catch {
    // body vide ou non-JSON : on retombe sur le status seul.
  }

  if (!resp.ok) {
    const retryRaw =
      json && typeof json === "object" && "retry_after_seconds" in json
        ? Number((json as { retry_after_seconds: unknown }).retry_after_seconds)
        : undefined;
    throw new ApiError(
      resp.status,
      extractErrorCode(json, `http_${resp.status}`),
      undefined,
      Number.isFinite(retryRaw) ? retryRaw : undefined,
    );
  }
  return json as T;
}

// ── OTP (même flux que l'app mobile) ──────────────────────────────

export interface OtpSendResponse {
  success: boolean;
  request_id: string;
}

/** Envoie le code OTP par SMS (Edge `otp-send`, Bearer = clé anon). */
export function sendOtp(phoneE164: string, fetchImpl: FetchImpl = fetch): Promise<OtpSendResponse> {
  return edgePost<OtpSendResponse>("otp-send", { phone_e164: phoneE164 }, SUPABASE_ANON_KEY, fetchImpl);
}

export interface OtpVerifyResponse {
  success: boolean;
  user_id: string;
  access_token: string;
  refresh_token: string;
}

/** Vérifie le code OTP (Edge `otp-verify`) → tokens de session GoTrue. */
export function verifyOtp(
  phoneE164: string,
  otpCode: string,
  fetchImpl: FetchImpl = fetch,
): Promise<OtpVerifyResponse> {
  return edgePost<OtpVerifyResponse>(
    "otp-verify",
    { phone_e164: phoneE164, otp_code: otpCode },
    SUPABASE_ANON_KEY,
    fetchImpl,
  );
}

// ── Checkout Gold (contrat payment-checkout) ──────────────────────

export type GoldPlan = "gold_monthly" | "gold_annual";

export interface CheckoutResponse {
  payment_url: string;
  transaction_id: string;
}

export interface CheckoutOptions {
  plan: GoldPlan;
  accessToken: string;
  returnUrl: string;
  fetchImpl?: FetchImpl;
  /** Force/désactive le mode démo (défaut : VITE_PAYMENT_MOCK). */
  mock?: boolean;
}

/**
 * Lance le checkout CinetPay (Orange Money, Wave, MTN MoMo).
 * En mode démo (VITE_PAYMENT_MOCK=1) : aucune requête réseau, on renvoie une
 * `payment_url` qui pointe directement sur /gold/retour avec un
 * transaction_id `mock-...` — la page retour simule alors le succès.
 */
export function startCheckout(opts: CheckoutOptions): Promise<CheckoutResponse> {
  const mock = opts.mock ?? isPaymentMock;
  if (mock) {
    const transactionId = `mock-${opts.plan}-${Date.now()}`;
    const url = new URL(opts.returnUrl);
    url.searchParams.set("transaction_id", transactionId);
    return Promise.resolve({ payment_url: url.toString(), transaction_id: transactionId });
  }
  return edgePost<CheckoutResponse>(
    "payment-checkout",
    { plan: opts.plan, return_url: opts.returnUrl },
    opts.accessToken,
    opts.fetchImpl ?? fetch,
  );
}

/** Redirection navigateur isolée pour rester testable (spy en vitest). */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
