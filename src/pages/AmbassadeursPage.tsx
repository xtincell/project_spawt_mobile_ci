// /ambassadeurs — programme ambassadeur SPAWT : les 3 paliers (contenu de
// référence dans lib/ambassadors.ts), et « Ton palier » pour le spawter
// connecté (table `ambassadors`, migration 0044, RLS own). Le palier est
// attribué par l'équipe — la page ne promet jamais d'automatisme : sans
// ligne, elle propose la candidature par email.

import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  PALIERS,
  palierNom,
  fetchAmbassadorStatus,
  type AmbassadorStatusResult,
} from "../lib/ambassadors";
import { formatDateFr } from "../lib/invoices";
import { CONTACT_EMAIL } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

const CANDIDATURE_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Candidature Ambassadeur SPAWT",
)}`;

type StatutBloc = { kind: "loading" } | { kind: "ready"; result: AmbassadorStatusResult };

/** CTA candidature — partagé entre l'état « sans palier » et le pied de page. */
function CandidatureCta() {
  return (
    <a className="btn btn--gold" href={CANDIDATURE_MAILTO}>
      Candidater par email
    </a>
  );
}

function TonPalier() {
  const { session } = useAuth();
  const [statut, setStatut] = useState<StatutBloc>({ kind: "loading" });

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    fetchAmbassadorStatus(session.access_token).then((result) => {
      if (!cancelled) setStatut({ kind: "ready", result });
    });
    return () => {
      cancelled = true;
    };
    // La session est stable (AuthProvider) ; on ne recharge que si elle change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  if (!session) {
    return (
      <div className="notice">
        <p>
          Déjà dans la Meute&nbsp;? Connecte-toi avec ton numéro pour voir si un
          palier t'attend.
        </p>
        <Link
          className="btn btn--night"
          to={`/connexion?next=${encodeURIComponent("/ambassadeurs")}`}
        >
          Me connecter
        </Link>
      </div>
    );
  }

  if (statut.kind === "loading") {
    return (
      <div role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
      </div>
    );
  }

  const { result } = statut;

  if (result.status === "ambassador") {
    const nom = palierNom(result.palier);
    return (
      <div className="notice">
        <p>
          <span className="pill pill--gold">
            Palier {result.palier} · {nom}
          </span>
        </p>
        <p style={{ marginBottom: 0 }}>
          {result.since
            ? `Tu portes la voix de la Meute depuis le ${formatDateFr(result.since)}. Merci d'être là — l'équipe te fait signe pour la suite.`
            : "Tu portes la voix de la Meute. Merci d'être là — l'équipe te fait signe pour la suite."}
        </p>
      </div>
    );
  }

  if (result.status === "session_expired") {
    return (
      <div className="notice">
        <p>Ta session a expiré — reconnecte-toi pour voir ton palier.</p>
        <Link
          className="btn btn--night"
          to={`/connexion?next=${encodeURIComponent("/ambassadeurs")}`}
        >
          Me reconnecter
        </Link>
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <p className="notice notice--danger" role="alert">
        Impossible de lire ton statut pour l'instant. Recharge la page ou
        réessaie plus tard.
      </p>
    );
  }

  // status === "none" : pas encore ambassadeur (ou table pas encore migrée).
  return (
    <div className="notice">
      <p>
        Pas de palier sur ton compte pour l'instant. Le palier est attribué par
        l'équipe SPAWT, à la main — pas de compteur automatique, on regarde
        qui tu es et ce que tu racontes.
      </p>
      <CandidatureCta />
    </div>
  );
}

export default function AmbassadeursPage() {
  usePageTitle("Programme ambassadeur");

  return (
    <>
      <section className="hero" style={{ paddingBlock: "var(--sp-2xl)" }}>
        <div className="container">
          <p className="section-kicker">Programme ambassadeur</p>
          <h1 className="hero__title" style={{ fontSize: "clamp(2rem, 7vw, 3.2rem)" }}>
            Deviens la voix de la Meute
          </h1>
          <p className="hero__pitch">
            Tu spawtes, tu racontes, ta communauté t'écoute&nbsp;? SPAWT te
            donne un micro — et met la main à la poche.
          </p>
        </div>
      </section>

      <section className="section" aria-labelledby="paliers-titre">
        <div className="container">
          <h2 className="section-title" id="paliers-titre">
            Trois paliers, une seule exigence&nbsp;: le vrai
          </h2>
          <p style={{ color: "var(--ink-soft)" }}>
            Chaque palier combine ce que tu vis dans l'app (tes spawts, ton
            stade) et ce que tu portes dehors (ta communauté, tes contenus).
          </p>
          <div className="card-grid card-grid--3">
            {PALIERS.map((p) => (
              <article
                key={p.palier}
                className={p.palier === 3 ? "price-card price-card--featured" : "price-card"}
              >
                {p.palier === 3 && <span className="price-card__flag">Le sommet</span>}
                <p className="price-card__ht">Palier {p.palier}</p>
                <h3>{p.nom}</h3>
                <p className="price-card__amount" style={{ fontSize: "var(--fs-xl)" }}>
                  {p.phare}
                  {p.pharePeriode && (
                    <span className="price-card__period"> {p.pharePeriode}</span>
                  )}
                </p>
                <p className="price-card__ht">Ce qu'il faut apporter</p>
                <ul>
                  {p.criteres.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
                <p className="price-card__ht">Ce que tu reçois</p>
                <ul>
                  {p.avantages.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--warm" aria-labelledby="ton-palier-titre">
        <div className="container container--narrow">
          <h2 className="section-title" id="ton-palier-titre">
            Ton palier
          </h2>
          <TonPalier />
        </div>
      </section>

      <section className="section" aria-labelledby="candidature-titre">
        <div className="container container--narrow">
          <h2 className="section-title" id="candidature-titre">
            Comment on entre&nbsp;?
          </h2>
          <p>
            Pas de formulaire froid&nbsp;: tu nous écris, tu nous montres tes
            spawts et tes contenus, et l'équipe te répond en vrai. Objet du
            mail déjà prêt, tu n'as qu'à raconter.
          </p>
          <CandidatureCta />
        </div>
      </section>
    </>
  );
}
