// /gold/retour — retour de la page de paiement CinetPay.
// Lit ?transaction_id= puis poll l'entitlement (3 s, max 2 min) via la vue
// RLS active_entitlements. Le Mobile Money peut échouer ou traîner : états
// attente / succès (confetti sobre + deep link spawt://) / échec (réessayer).
// Mode démo : transaction_id `mock-...` + VITE_PAYMENT_MOCK=1 → succès simulé.

import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import Confetti from "../components/Confetti";
import { hasFreshlyActivatedGold, pollEntitlement } from "../lib/entitlement";
import { APP_DEEP_LINK, isPaymentMock } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

type Status = "waiting" | "active" | "timeout" | "session_expired" | "missing_txn";

export default function RetourPage() {
  usePageTitle("Confirmation du paiement");
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
      // Succès sur `active` STRICT : une grâce préexistante (renouvellement
      // pendant la fenêtre de grâce) ne doit PAS déclarer « Bienvenue chez les
      // Gold » tant que le nouveau paiement n'a pas réellement activé la ligne.
      isActive: (rows) => hasFreshlyActivatedGold(rows, transactionId),
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
          <h1>Bienvenue chez les Gold ✨</h1>
          <p style={{ fontSize: "var(--fs-lg)", color: "var(--ink-soft)" }}>
            Rouvre l'app, tout Abidjan t'attend. Ton badge doré est déjà sur ton
            profil.
          </p>
          <p style={{ display: "flex", flexDirection: "column", gap: "var(--sp-md)", alignItems: "center" }}>
            <a className="btn btn--gold" href={APP_DEEP_LINK}>
              Ouvrir SPAWT
            </a>
            <Link className="btn btn--ghost" to="/compte">
              Voir mon abonnement
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
            payer, pas de panique&nbsp;: ton compte s'active dès confirmation.
          </p>
          <Link className="btn btn--night" to="/compte">
            Vérifier mon abonnement
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
            paiement est passé, ton Gold sera déjà actif.
          </p>
          <Link
            className="btn btn--accent"
            to={`/connexion?next=${encodeURIComponent(`/gold/retour?transaction_id=${transactionId ?? ""}`)}`}
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
            insuffisant, validation non confirmée sur le téléphone, réseau… Si tu
            as validé, laisse-lui une minute et vérifie ton compte. Sinon,
            réessaie — rien n'est débité tant que ce n'est pas confirmé.
          </p>
          <p style={{ display: "flex", gap: "var(--sp-md)", flexWrap: "wrap" }}>
            <Link className="btn btn--gold" to="/gold/paiement">
              Réessayer le paiement
            </Link>
            <Link className="btn btn--ghost" to="/compte">
              Voir mon compte
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
