// Factures du spawter — /compte.
// GET /rest/v1/invoices?select=invoice_number,price_ttc,currency,status,issued_at
//     &order=issued_at.desc   (RLS own rows)
// La table peut ne pas encore être déployée (chantier facturation) : 404 /
// 42P01 → { available: false } et l'UI affiche « historique bientôt là ».

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import { ApiError } from "./api";

type FetchImpl = typeof fetch;

export interface Invoice {
  invoice_number: string;
  price_ttc: number;
  currency: string;
  status: string;
  issued_at: string;
}

export type InvoicesResult =
  | { available: true; invoices: Invoice[] }
  | { available: false };

export async function fetchInvoices(
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<InvoicesResult> {
  let resp: Response;
  try {
    resp = await fetchImpl(
      `${SUPABASE_URL}/rest/v1/invoices?select=invoice_number,price_ttc,currency,status,issued_at&order=issued_at.desc`,
      {
        headers: {
          apikey: SUPABASE_ANON_KEY,
          authorization: `Bearer ${accessToken}`,
          accept: "application/json",
        },
      },
    );
  } catch {
    return { available: false };
  }
  if (resp.status === 401) throw new ApiError(401, "session_expired");
  if (!resp.ok) return { available: false };
  const rows = (await resp.json()) as unknown;
  return { available: true, invoices: Array.isArray(rows) ? (rows as Invoice[]) : [] };
}

/** Montant en F CFA affiché à l'ivoirienne : « 2 950 F CFA ». */
export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} F CFA`;
}

/** Date courte FR : « 26 juil. 2026 ». */
export function formatDateFr(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(d);
}
