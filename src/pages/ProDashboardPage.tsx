// /pro/dashboard — shell du tableau de bord lieux (auth requis).
// Détecte le rôle via b2b_accounts (RLS own). Sans compte relié → invitation
// mailto. Avec compte → onglets Aperçu / Avis / Audience dont les panneaux
// sont PRÊTS à recevoir les vraies vues SQL (b2b_place_stats_monthly,
// b2b_place_funnel — chantier parallèle, cf. lib/b2b-data.ts) : tant que les
// vues n'existent pas, fallback propre « stats en construction ».

import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  fetchB2bAccount,
  fetchPlaceMonthlyStats,
  fetchPlaceFunnel,
  type B2bAccount,
  type B2bDataResult,
  type PlaceMonthlyStats,
  type PlaceFunnelStep,
} from "../lib/b2b-data";
import { ApiError } from "../lib/api";
import { CONTACT_EMAIL } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

type Tab = "apercu" | "avis" | "audience";

type AccountState =
  | { kind: "loading" }
  | { kind: "none" }
  | { kind: "linked"; account: B2bAccount }
  | { kind: "error" };

function StatsPanel<T>({
  title,
  result,
  description,
}: {
  title: string;
  result: B2bDataResult<T> | null;
  description: string;
}) {
  return (
    <div className="card">
      <h3>{title}</h3>
      {result === null && <div className="spinner" aria-hidden="true" />}
      {result !== null && !result.available && (
        <p>
          <span className="pill pill--warm">Stats en construction</span>
          <br />
          {description}
        </p>
      )}
      {result !== null && result.available && result.rows.length === 0 && (
        <p>Pas encore de données pour ton lieu — ça vient avec les spawts.</p>
      )}
      {result !== null && result.available && result.rows.length > 0 && (
        // Les vues SQL arrivent (chantier parallèle) : en attendant un rendu
        // graphique dédié, on affiche les lignes brutes de façon lisible.
        <div className="table-wrap">
          <pre style={{ fontSize: "var(--fs-xs)", overflowX: "auto" }}>
            {JSON.stringify(result.rows, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function ProDashboardPage() {
  usePageTitle("Tableau de bord — Espace lieux");
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<AccountState>({ kind: "loading" });
  const [tab, setTab] = useState<Tab>("apercu");
  const [monthly, setMonthly] = useState<B2bDataResult<PlaceMonthlyStats> | null>(null);
  const [funnel, setFunnel] = useState<B2bDataResult<PlaceFunnelStep> | null>(null);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const token = session.access_token;

    const load = async () => {
      try {
        const acc = await fetchB2bAccount(token);
        if (cancelled) return;
        if (!acc) {
          setAccount({ kind: "none" });
          return;
        }
        setAccount({ kind: "linked", account: acc });
        // Chargement parallèle des deux vues de stats (fallback géré en lib).
        const [m, f] = await Promise.all([
          fetchPlaceMonthlyStats(acc.place_id, token),
          fetchPlaceFunnel(acc.place_id, token),
        ]);
        if (cancelled) return;
        setMonthly(m);
        setFunnel(f);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.code === "session_expired") {
          await signOut();
          navigate(`/connexion?next=${encodeURIComponent("/pro/dashboard")}`);
          return;
        }
        setAccount({ kind: "error" });
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (account.kind === "loading") {
    return (
      <section className="section container" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
      </section>
    );
  }

  if (account.kind === "none") {
    return (
      <section className="section">
        <div className="container container--narrow">
          <p className="section-kicker">Espace lieux</p>
          <h1>Ton lieu n'est pas encore relié</h1>
          <p>
            Ce numéro n'est rattaché à aucun lieu pour l'instant. C'est vite
            réglé&nbsp;: écris-nous avec le nom de ton lieu et ton quartier, on
            fait le rattachement à la main (et on en profite pour te dire
            bonjour).
          </p>
          <a
            className="btn btn--accent"
            href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Relier mon lieu sur SPAWT")}`}
          >
            Écris-nous — {CONTACT_EMAIL}
          </a>
        </div>
      </section>
    );
  }

  if (account.kind === "error") {
    return (
      <section className="section">
        <div className="container container--narrow">
          <p className="notice notice--danger" role="alert">
            Impossible de charger ton espace pour l'instant. Recharge la page ou
            réessaie plus tard.
          </p>
        </div>
      </section>
    );
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "apercu", label: "Aperçu" },
    { id: "avis", label: "Avis" },
    { id: "audience", label: "Audience" },
  ];

  return (
    <section className="section">
      <div className="container">
        <p className="section-kicker">Espace lieux</p>
        <h1>Ton tableau de bord</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Lieu relié&nbsp;: <code>{account.account.place_id}</code> — rôle{" "}
          <strong>{account.account.role}</strong>.
        </p>

        <div className="tabs" role="tablist" aria-label="Sections du tableau de bord">
          {tabs.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "apercu" && (
          <div className="card-grid card-grid--2" role="tabpanel">
            <StatsPanel
              title="Activité mensuelle"
              result={monthly}
              description="Spawts, visiteurs uniques et notes moyennes arrivent ici dès que la Meute aura bien mangé (vue b2b_place_stats_monthly en cours de déploiement)."
            />
            <StatsPanel
              title="Funnel découverte → venue"
              result={funnel}
              description="Combien te voient, combien viennent : le funnel arrive ici (vue b2b_place_funnel en cours de déploiement)."
            />
          </div>
        )}

        {tab === "avis" && (
          <div className="card" role="tabpanel">
            <h3>Les avis sur ton lieu</h3>
            <p>
              <span className="pill pill--warm">En construction</span>
              <br />
              La lecture et la réponse aux avis (offre Pro) arrivent ici. En
              attendant, l'équipe peut te transmettre tes derniers avis par
              email.
            </p>
          </div>
        )}

        {tab === "audience" && (
          <div className="card" role="tabpanel">
            <h3>Qui pousse ta porte</h3>
            <p>
              <span className="pill pill--warm">En construction</span>
              <br />
              Répartition par archétype et heures chaudes (offre Spawt Gold)
              arrivent ici, branchées sur les mêmes vues que l'aperçu.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
