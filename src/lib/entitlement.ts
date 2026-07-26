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

/** Codes des plans B2B (espace lieux) — alignés subscriptions.plan (0032). */
export const B2B_PLAN_CODES = ["pro", "b2b_gold"] as const;

/**
 * La ligne porte-t-elle un plan B2B (lieu) ? La vue active_entitlements ne
 * filtre pas par famille de plan : un compte lieu y voit ses lignes pro /
 * b2b_gold. Parsing défensif : sans colonne `plan`, on considère la ligne
 * B2C (comportement historique de la vue).
 */
export function isB2bEntitlementRow(row: EntitlementRow): boolean {
  return (
    typeof row.plan === "string" &&
    (B2B_PLAN_CODES as readonly string[]).includes(row.plan)
  );
}

/** Le spawter a-t-il un entitlement Gold (B2C) actif ? Les lignes de plans
 *  B2B (pro / b2b_gold) sont exclues — un compte lieu n'est pas Gold spawter. */
export function hasActiveGold(rows: EntitlementRow[]): boolean {
  return rows.filter((r) => !isB2bEntitlementRow(r)).some(isEntitlementActive);
}

/** Le compte lieu a-t-il un abonnement B2B (pro / b2b_gold) actif ? */
export function hasActiveB2b(rows: EntitlementRow[]): boolean {
  return rows.filter(isB2bEntitlementRow).some(isEntitlementActive);
}

// ── Retour de paiement : « fraîchement activé » (strict, grâce EXCLUE) ──
//
// `isEntitlementActive` compte la grâce comme active — c'est CORRECT pour le
// dashboard et /compte (l'accès reste ouvert pendant la fenêtre de grâce).
// MAIS c'est un piège sur le retour de paiement : un spawter qui renouvelle
// PENDANT sa grâce (le checkout l'autorise par design) a déjà une ancienne
// souscription `status='grace'` dans la vue. Avec le prédicat souple, le 1er
// tick de poll validerait le retour (« Bienvenue chez les Gold ») quel que
// soit le sort du NOUVEAU paiement — l'échec ne se découvrirait qu'à
// l'expiration de la grâce. Le retour exige donc un prédicat STRICT : seule
// une ligne réellement `active` (période courante non échue, grâce exclue)
// déclare le succès.

/** Colonnes candidates portant l'identifiant de transaction (schéma non figé). */
const TXN_ID_COLUMNS = [
  "transaction_id",
  "last_transaction_id",
  "latest_transaction_id",
  "provider_transaction_id",
  "checkout_transaction_id",
  "cinetpay_transaction_id",
  "cpm_trans_id",
  "txn_id",
] as const;

/** Identifiant de transaction porté par la ligne, si la vue l'expose. */
function rowTransactionId(row: EntitlementRow): string | null {
  for (const key of TXN_ID_COLUMNS) {
    const v = row[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * Variante STRICTE d'`isEntitlementActive` : la grâce n'est PAS un état actif.
 * Une ligne est strictement active si :
 *  - son `status` (s'il existe) vaut active/actif/trialing — grace/grace_period
 *    et tout autre statut sont refusés, ET
 *  - sa fin de période (si exposée) n'est pas passée (une échéance dépassée =
 *    au mieux une grâce, jamais une activation fraîche).
 * Sans status ni date exposés, la présence dans la vue fait foi (rétro-compat) ;
 * la corrélation transaction_id (cf. isFreshlyActivated) lève alors l'ambiguïté.
 */
export function isStrictlyActive(row: EntitlementRow): boolean {
  const status = row.status;
  if (typeof status === "string") {
    const ok = ["active", "actif", "trialing"].includes(status.toLowerCase());
    if (!ok) return false;
  }
  const end = entitlementEndDate(row);
  if (end !== null && end.getTime() < Date.now()) return false;
  return true;
}

/**
 * La ligne correspond-elle à une activation FRAÎCHE issue de ce retour ?
 *  - strictement active (grâce exclue), ET
 *  - si `transactionId` est connu ET que la vue expose l'identifiant de
 *    transaction sur cette ligne, il doit correspondre (défense en profondeur
 *    contre une activation concurrente). Colonne absente → on retombe sur le
 *    strict-actif (la vue peut ne pas exposer la transaction).
 */
export function isFreshlyActivated(
  row: EntitlementRow,
  transactionId?: string | null,
): boolean {
  if (!isStrictlyActive(row)) return false;
  if (transactionId) {
    const rowTxn = rowTransactionId(row);
    if (rowTxn !== null && rowTxn !== transactionId) return false;
  }
  return true;
}

/**
 * Prédicat de retour Gold (B2C) : succès UNIQUEMENT si une ligne Gold est
 * fraîchement activée (grâce préexistante exclue). Optionnellement corrélé au
 * transaction_id du retour. Les lignes B2B sont ignorées (cf. hasActiveGold).
 */
export function hasFreshlyActivatedGold(
  rows: EntitlementRow[],
  transactionId?: string | null,
): boolean {
  return rows
    .filter((r) => !isB2bEntitlementRow(r))
    .some((r) => isFreshlyActivated(r, transactionId));
}

/**
 * Prédicat de retour lieu (B2B) : succès UNIQUEMENT si une ligne pro/b2b_gold
 * est fraîchement activée (grâce préexistante exclue), optionnellement corrélée
 * au transaction_id du retour.
 */
export function hasFreshlyActivatedB2b(
  rows: EntitlementRow[],
  transactionId?: string | null,
): boolean {
  return rows
    .filter(isB2bEntitlementRow)
    .some((r) => isFreshlyActivated(r, transactionId));
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
  /**
   * Prédicat d'activation sur les lignes de la vue (défaut : hasActiveGold).
   * Les pages de retour passent le prédicat STRICT correspondant
   * (hasFreshlyActivatedGold / hasFreshlyActivatedB2b) : elles ne déclarent le
   * succès que sur une ligne réellement `active`, jamais sur une grâce
   * préexistante (cf. isFreshlyActivated).
   */
  isActive?: (rows: EntitlementRow[]) => boolean;
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
      if ((opts.isActive ?? hasActiveGold)(rows)) return "active";
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
