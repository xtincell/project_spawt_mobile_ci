// /gold/paiement — checkout Gold (auth requis, cf. RequireAuth dans App).
// Choix mensuel/annuel → POST payment-checkout (contrat documenté dans
// lib/api.ts) → redirection vers la page CinetPay (Orange Money, Wave,
// MTN MoMo). Erreurs contractuelles : 401 session expirée → relogin,
// 409 already_active → déjà Gold (compte), 502 provider_error → réessayer.
// Mode démo VITE_PAYMENT_MOCK=1 : redirige directement vers /gold/retour.

import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { startCheckout, redirectTo, ApiError, type GoldPlan } from "../lib/api";
import { isPaymentMock } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

const PLANS: Array<{
  id: GoldPlan;
  label: string;
  priceTtc: string;
  detail: string;
  flag?: string;
}> = [
  {
    id: "gold_monthly",
    label: "Mensuel",
    priceTtc: "2 950 F CFA /mois TTC",
    detail: "Sans engagement — 2 500 F CFA HT + TVA 18 %",
  },
  {
    id: "gold_annual",
    label: "Annuel",
    priceTtc: "29 500 F CFA /an TTC",
    detail: "2 mois offerts — 25 000 F CFA HT + TVA 18 %",
    flag: "2 mois offerts",
  },
];

export default function CheckoutPage() {
  usePageTitle("Paiement Gold");
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<GoldPlan>("gold_annual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyGold, setAlreadyGold] = useState(false);

  const pay = async () => {
    if (busy || !session) return;
    setError(null);
    setBusy(true);
    try {
      const { payment_url } = await startCheckout({
        plan,
        accessToken: session.access_token,
        returnUrl: `${window.location.origin}/gold/retour`,
      });
      redirectTo(payment_url);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          // Session expirée → on nettoie et on renvoie vers la connexion.
          await signOut();
          navigate(`/connexion?next=${encodeURIComponent("/gold/paiement")}`);
          return;
        }
        if (err.code === "already_active") {
          setAlreadyGold(true);
          return;
        }
        if (err.code === "provider_error") {
          setError(
            "Notre partenaire de paiement ne répond pas. Rien n'a été débité — réessaie dans un instant.",
          );
          return;
        }
        if (err.code === "network_error") {
          setError("Pas de réseau. Vérifie ta connexion et réessaie.");
          return;
        }
      }
      setError("Un pépin de notre côté. Rien n'a été débité — réessaie.");
    } finally {
      setBusy(false);
    }
  };

  if (alreadyGold) {
    return (
      <section className="section">
        <div className="container container--narrow">
          <h1>Tu es déjà Gold ✨</h1>
          <p>
            Ton abonnement est déjà actif — pas besoin de payer deux fois. Le
            détail est sur ta page compte.
          </p>
          <Link className="btn btn--gold" to="/compte">
            Voir mon abonnement
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container container--narrow">
        <p className="section-kicker">Spawter Gold</p>
        <h1>Choisis ta formule</h1>
        {isPaymentMock && (
          <p className="notice" role="status">
            Mode démo paiement actif (VITE_PAYMENT_MOCK=1)&nbsp;: aucun débit,
            le retour de paiement sera simulé.
          </p>
        )}
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__hint" style={{ marginBottom: "var(--sp-md)" }}>
            Paiement sécurisé via CinetPay — Orange Money, Wave, MTN MoMo.
          </legend>
          <div className="card-grid card-grid--2">
            {PLANS.map((p) => (
              <label
                key={p.id}
                className={`price-card${plan === p.id ? " price-card--featured" : ""}`}
                style={{ cursor: "pointer" }}
              >
                {p.flag && <span className="price-card__flag">{p.flag}</span>}
                <input
                  type="radio"
                  name="plan"
                  value={p.id}
                  checked={plan === p.id}
                  onChange={() => setPlan(p.id)}
                  style={{ accentColor: "var(--or)" }}
                />
                <h3 style={{ marginBottom: 0 }}>{p.label}</h3>
                <p className="price-card__amount" style={{ fontSize: "var(--fs-2xl)" }}>
                  {p.priceTtc}
                </p>
                <p className="price-card__ht">{p.detail}</p>
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="btn btn--gold btn--block"
          style={{ marginTop: "var(--sp-lg)" }}
          onClick={() => void pay()}
          disabled={busy}
        >
          {busy ? "Ouverture du paiement…" : "Payer avec Mobile Money"}
        </button>
        <p className="field__hint" style={{ marginTop: "var(--sp-md)" }}>
          Tu seras redirigé vers la page sécurisée de notre partenaire CinetPay
          pour valider le paiement sur ton téléphone.
        </p>
      </div>
    </section>
  );
}
