// Entitlements Gold — lecture REST (PostgREST) + polling post-paiement.
// Décisions :
//  - `active_entitlements` est une vue RLS « own rows » : la présence d'une
//    ligne pour le spawter connecté fait foi. Le schéma exact est un chantier
//    parallèle → parsing DÉFENSIF (on tolère les colonnes absentes).
//  - poll toutes les 3 s, 2 min max (paiement Mobile Money = validation sur le
//    téléphone du spawter, ça peut prendre du temps).

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { ApiError } from "./api";

type FetchImpl = typeof fetch;

/** Ligne d'entitlement telle que remontée par la vue (schéma non figé). */
export interface EntitlementRow {
  [key: string]: unknown;
}

/** GET /rest/v1/active_entitlements?select=* avec le token du spawter (RLS). */
export async function fetchActiveEntitlements(
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<EntitlementRow[]> {
  let resp: Response;
  try {
    resp = await fetchImpl(`${SUPABASE_URL}/rest/v1/active_entitlements?select=*`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
    });
  } catch {
    throw new ApiError(0, "network_error");
  }
  if (!resp.ok) {
    throw new ApiError(resp.status, resp.status === 401 ? "session_expired" : `http_${resp.status}`);
  }
  const rows = (await resp.json()) as unknown;
  return Array.isArray(rows) ? (rows as EntitlementRow[]) : [];
}

/** Lit une date parmi plusieurs noms de colonnes candidats. */
function readDate(row: EntitlementRow, keys: string[]): Date | null {
  for (const key of keys) {
    const v = row[key];
    if (typeof v === "string") {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }
  return null;
}

/** Fin de période (renouvellement / expiration) si la vue l'expose. */
export function entitlementEndDate(row: EntitlementRow): Date | null {
  return readDate(row, ["expires_at", "current_period_end", "valid_until", "ends_at"]);
}

/** Fin de période de grâce (7 jours post-échéance) si exposée. */
export function entitlementGraceDate(row: EntitlementRow): Date | null {
  return readDate(row, ["grace_until", "grace_period_end", "grace_ends_at"]);
}

/**
 * Une ligne est considérée active si :
 *  - son `status` (s'il existe) est actif/en grâce, ET
 *  - sa fin de période (si exposée) n'est pas passée — sinon la simple
 *    présence dans la vue `active_entitlements` fait foi.
 */
export function isEntitlementActive(row: EntitlementRow): boolean {
  const status = row.status;
  if (typeof status === "string") {
    const ok = ["active", "actif", "grace", "grace_period", "trialing"].includes(
      status.toLowerCase(),
    );
    if (!ok) return false;
  }
  const end = entitlementEndDate(row);
  if (end !== null && end.getTime() < Date.now()) {
    const grace = entitlementGraceDate(row);
    return grace !== null && grace.getTime() >= Date.now();
  }
  return true;
}

/** Le spawter a-t-il un entitlement Gold actif ? */
export function hasActiveGold(rows: EntitlementRow[]): boolean {
  return rows.some(isEntitlementActive);
}

export type PollOutcome = "active" | "timeout" | "session_expired";

export interface PollOptions {
  accessToken: string;
  /** Intervalle entre deux lectures (défaut 3 000 ms). */
  intervalMs?: number;
  /** Durée max de poll (défaut 120 000 ms). */
  timeoutMs?: number;
  /** Abandon externe (navigation, unmount). */
  signal?: AbortSignal;
  fetchImpl?: FetchImpl;
  /** Callback à chaque tentative (n° de tentative, 1-indexé). */
  onAttempt?: (attempt: number) => void;
}

/**
 * Poll l'entitlement jusqu'à activation, timeout ou session expirée.
 * Les erreurs réseau transitoires sont avalées (on retentera au tick suivant).
 */
export async function pollEntitlement(opts: PollOptions): Promise<PollOutcome> {
  const intervalMs = opts.intervalMs ?? 3_000;
  const timeoutMs = opts.timeoutMs ?? 120_000;
  const deadline = Date.now() + timeoutMs;
  let attempt = 0;

  while (Date.now() <= deadline) {
    if (opts.signal?.aborted) return "timeout";
    attempt += 1;
    opts.onAttempt?.(attempt);
    try {
      const rows = await fetchActiveEntitlements(opts.accessToken, opts.fetchImpl ?? fetch);
      if (hasActiveGold(rows)) return "active";
    } catch (err) {
      if (err instanceof ApiError && err.code === "session_expired") return "session_expired";
      // transitoire (réseau, 5xx) : on laisse le prochain tick réessayer.
    }
    if (Date.now() + intervalMs > deadline) break;
    await new Promise<void>((resolve) => {
      const id = setTimeout(resolve, intervalMs);
      opts.signal?.addEventListener("abort", () => {
        clearTimeout(id);
        resolve();
      });
    });
  }
  return "timeout";
}
