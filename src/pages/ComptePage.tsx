// /compte — Mon abonnement (auth requis).
// Statut Gold (actif / période de grâce / expiré / aucun), bouton renouveler
// (→ checkout), historique de factures (RLS own) et déconnexion.

import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  fetchActiveEntitlements,
  entitlementEndDate,
  entitlementGraceDate,
  isEntitlementActive,
  type EntitlementRow,
} from "../lib/entitlement";
import { fetchInvoices, formatFcfa, formatDateFr, type InvoicesResult } from "../lib/invoices";
import { ApiError } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

type GoldStatus =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "active"; until: Date | null }
  | { kind: "grace"; until: Date | null }
  | { kind: "expired"; since: Date | null }
  | { kind: "error" };

function computeStatus(rows: EntitlementRow[]): GoldStatus {
  if (rows.length === 0) return { kind: "none" };
  const active = rows.find(isEntitlementActive);
  if (active) {
    const end = entitlementEndDate(active);
    // Fin de période passée mais ligne encore active → période de grâce.
    if (end !== null && end.getTime() < Date.now()) {
      return { kind: "grace", until: entitlementGraceDate(active) };
    }
    return { kind: "active", until: end };
  }
  const last = rows[0];
  return { kind: "expired", since: entitlementEndDate(last) };
}

export default function ComptePage() {
  usePageTitle("Mon abonnement");
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<GoldStatus>({ kind: "loading" });
  const [invoices, setInvoices] = useState<InvoicesResult | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const token = session.access_token;

    const load = async () => {
      try {
        const rows = await fetchActiveEntitlements(token);
        if (!cancelled) setStatus(computeStatus(rows));
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "session_expired") {
          await signOut();
          navigate("/connexion?next=%2Fcompte");
          return;
        }
        setStatus({ kind: "error" });
      }
      try {
        const inv = await fetchInvoices(token);
        if (!cancelled) setInvoices(inv);
      } catch {
        if (!cancelled) setInvoices({ available: false });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // signOut/navigate stables ; on recharge uniquement si la session change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const logout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <section className="section">
      <div className="container container--narrow">
        <p className="section-kicker">Mon compte</p>
        <h1>Ton abonnement</h1>

        {status.kind === "loading" && (
          <div role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true" />
          </div>
        )}

        {status.kind === "active" && (
          <div className="notice">
            <p>
              <span className="pill pill--gold">Gold actif</span>
            </p>
            <p style={{ marginBottom: 0 }}>
              {status.until
                ? `Ton Gold court jusqu'au ${formatDateFr(status.until)}. On te fera signe à J-3 pour le renouvellement — rien n'est prélevé tout seul.`
                : "Ton Gold est actif. On te fera signe avant l'échéance — rien n'est prélevé tout seul."}
            </p>
          </div>
        )}

        {status.kind === "grace" && (
          <div className="notice">
            <p>
              <span className="pill pill--warm">Période de grâce</span>
            </p>
            <p>
              {status.until
                ? `Ton échéance est passée, mais tu gardes ton Gold jusqu'au ${formatDateFr(status.until)}. Renouvelle avant cette date pour ne rien perdre.`
                : "Ton échéance est passée — tu es dans les 7 jours de grâce. Renouvelle pour ne rien perdre."}
            </p>
            <Link className="btn btn--gold" to="/gold/paiement">
              Renouveler maintenant
            </Link>
          </div>
        )}

        {status.kind === "expired" && (
          <div className="notice">
            <p>
              <span className="pill pill--danger">Expiré</span>
            </p>
            <p>
              {status.since
                ? `Ton Gold s'est arrêté le ${formatDateFr(status.since)}. Tout Abidjan te manque déjà ?`
                : "Ton Gold est arrivé à échéance. Tout Abidjan te manque déjà ?"}
            </p>
            <Link className="btn btn--gold" to="/gold/paiement">
              Renouveler mon Gold
            </Link>
          </div>
        )}

        {status.kind === "none" && (
          <div className="notice">
            <p style={{ marginBottom: "var(--sp-md)" }}>
              Pas encore d'abonnement actif. Ton Palais tourne en rayon limité.
            </p>
            <Link className="btn btn--gold" to="/gold">
              Découvrir Spawter Gold
            </Link>
          </div>
        )}

        {status.kind === "error" && (
          <p className="notice notice--danger" role="alert">
            Impossible de lire ton abonnement pour l'instant. Recharge la page
            ou réessaie plus tard.
          </p>
        )}

        <h2 style={{ marginTop: "var(--sp-xl)" }}>Tes factures</h2>
        {invoices === null && <p style={{ color: "var(--ink-mute)" }}>Chargement…</p>}
        {invoices !== null && !invoices.available && (
          <p style={{ color: "var(--ink-soft)" }}>
            L'historique de facturation arrive bientôt ici. Besoin d'une facture
            tout de suite&nbsp;? Écris-nous.
          </p>
        )}
        {invoices !== null && invoices.available && invoices.invoices.length === 0 && (
          <p style={{ color: "var(--ink-soft)" }}>Aucune facture pour le moment.</p>
        )}
        {invoices !== null && invoices.available && invoices.invoices.length > 0 && (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">N°</th>
                  <th scope="col">Date</th>
                  <th scope="col">Montant TTC</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                {invoices.invoices.map((inv) => (
                  <tr key={inv.invoice_number}>
                    <td>{inv.invoice_number}</td>
                    <td>{formatDateFr(inv.issued_at)}</td>
                    <td>
                      {inv.currency === "XOF" || !inv.currency
                        ? formatFcfa(inv.price_ttc)
                        : `${inv.price_ttc} ${inv.currency}`}
                    </td>
                    <td>{inv.status === "paid" ? "Payée" : inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <hr style={{ border: 0, borderTop: "1px solid var(--line)", margin: "var(--sp-xl) 0" }} />
        <button className="btn btn--ghost" onClick={() => void logout()}>
          Me déconnecter
        </button>
      </div>
    </section>
  );
}
