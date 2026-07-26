// /pro/retour — retour de la page de paiement CinetPay pour un plan LIEU
// (pro / b2b_gold). Même mécanique que /gold/retour : lit ?transaction_id=
// puis poll la vue RLS active_entitlements (3 s, max 2 min) — mais avec le
// prédicat hasActiveB2b (lignes pro/b2b_gold uniquement). Le webhook
// synchronise aussi b2b_accounts.role à l'activation : au retour dashboard,
// le funnel Gold est déjà ouvert si le lieu a pris b2b_gold.
// Mode démo : transaction_id `mock-...` + VITE_PAYMENT_MOCK=1 → succès simulé.

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import Confetti from "../components/Confetti";
import { hasActiveB2b, pollEntitlement } from "../lib/entitlement";
import { isPaymentMock } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

type Status = "waiting" | "active" | "timeout" | "session_expired" | "missing_txn";

export default function ProRetourPage() {
  usePageTitle("Confirmation du paiement — Espace lieux");
  const [params] = useSearchParams();
  const { session } = useAuth();
  const [status, setStatus] = useState<Status>("waiting");
  const [attempt, setAttempt] = useState(0);
  const startedRef = useRef(false);
  const transactionId = params.get("transaction_id");

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    if (!transactionId) {
      setStatus("missing_txn");
      return;
    }

    // Mode démo : pas de backend, on simule la validation du paiement.
    if (isPaymentMock && transactionId.startsWith("mock-")) {
      const id = setTimeout(() => setStatus("active"), 1500);
      return () => clearTimeout(id);
    }

    if (!session) {
      setStatus("session_expired");
      return;
    }

    const abort = new AbortController();
    void pollEntitlement({
      accessToken: session.access_token,
      signal: abort.signal,
      onAttempt: setAttempt,
      isActive: hasActiveB2b,
    }).then((outcome) => {
      if (!abort.signal.aborted) setStatus(outcome);
    });
    return () => abort.abort();
  }, [transactionId, session]);

  if (status === "active") {
    return (
      <section className="section" aria-live="polite">
        <Confetti />
        <div className="container container--narrow" style={{ textAlign: "center" }}>
          <p className="section-kicker">C'est validé</p>
          <h1>L'abonnement de ton lieu est actif ✨</h1>
          <p style={{ fontSize: "var(--fs-lg)", color: "var(--ink-soft)" }}>
            La facture est déjà dans ton espace, et ton tableau de bord est à
            jour. Bonne route avec la Meute.
          </p>
          <p style={{ display: "flex", flexDirection: "column", gap: "var(--sp-md)", alignItems: "center" }}>
            <Link className="btn btn--gold" to="/pro/dashboard">
              Voir mon tableau de bord
            </Link>
          </p>
        </div>
      </section>
    );
  }

  if (status === "missing_txn") {
    return (
      <section className="section">
        <div className="container container--narrow">
          <h1>Il manque un morceau</h1>
          <p>
            On n'a pas retrouvé la référence de ton paiement. Si tu viens de
            payer, pas de panique&nbsp;: l'abonnement de ton lieu s'active dès
            confirmation.
          </p>
          <Link className="btn btn--night" to="/pro/dashboard">
            Vérifier mon espace lieux
          </Link>
        </div>
      </section>
    );
  }

  if (status === "session_expired") {
    return (
      <section className="section">
        <div className="container container--narrow">
          <h1>Reconnecte-toi</h1>
          <p>
            Ta session a expiré pendant le paiement. Reconnecte-toi&nbsp;: si le
            paiement est passé, l'abonnement de ton lieu sera déjà actif.
          </p>
          <Link
            className="btn btn--accent"
            to={`/connexion?next=${encodeURIComponent(`/pro/retour?transaction_id=${transactionId ?? ""}`)}`}
          >
            Me reconnecter
          </Link>
        </div>
      </section>
    );
  }

  if (status === "timeout") {
    return (
      <section className="section">
        <div className="container container--narrow">
          <h1>Le paiement n'est pas (encore) passé</h1>
          <p>
            Le Mobile Money peut échouer ou mettre du temps&nbsp;: solde
            insuffisant, validation non confirmée sur le téléphone, réseau… Si
            tu as validé, laisse-lui une minute et recharge ton espace. Sinon,
            relance le paiement depuis ton tableau de bord — rien n'est débité
            tant que ce n'est pas confirmé.
          </p>
          <p style={{ display: "flex", gap: "var(--sp-md)", flexWrap: "wrap" }}>
            <Link className="btn btn--gold" to="/pro/dashboard">
              Retour à mon espace lieux
            </Link>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="section" aria-live="polite">
      <div className="container container--narrow" style={{ textAlign: "center" }}>
        <div className="spinner" aria-hidden="true" />
        <h1 style={{ marginTop: "var(--sp-lg)" }}>On confirme ton paiement…</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Valide l'opération sur ton téléphone si ce n'est pas déjà fait. Cette
          page se met à jour toute seule{attempt > 1 ? ` (tentative ${attempt})` : ""}.
        </p>
      </div>
    </section>
  );
}
