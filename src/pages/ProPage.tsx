// /pro — Espace lieux (B2B) : présentation des trois tiers (Libre / Pro /
// Gold), prix affichés HT + mention TVA (usage B2B), et accès au dashboard
// via le même login OTP que les spawters.

import { Link } from "react-router";
import { CONTACT_EMAIL } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

export default function ProPage() {
  usePageTitle("Espace lieux");
  const { session } = useAuth();
  const dashboardHref = session
    ? "/pro/dashboard"
    : `/connexion?next=${encodeURIComponent("/pro/dashboard")}`;

  return (
    <>
      <section className="hero" style={{ paddingBlock: "var(--sp-2xl)" }}>
        <div className="container">
          <p className="section-kicker">Espace lieux</p>
          <h1 className="hero__title" style={{ fontSize: "clamp(2rem, 7vw, 3.2rem)" }}>
            La Meute parle déjà de toi
          </h1>
          <p className="hero__pitch">
            Maquis, table, spot de nuit&nbsp;: tes clients spawtent chez toi.
            Reprends la main sur ta fiche et comprends qui pousse ta porte.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--gold" to={dashboardHref}>
              Accéder à mon espace
            </Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="pro-tiers">
        <div className="container">
          <h2 className="section-title" id="pro-tiers">
            Trois niveaux, prix HT
          </h2>
          <p style={{ color: "var(--ink-soft)" }}>
            Prix professionnels affichés hors taxes — TVA 18&nbsp;% en sus,
            facture en bonne et due forme.
          </p>
          <div className="card-grid card-grid--3">
            <article className="price-card">
              <h3>Spawt Libre</h3>
              <p className="price-card__amount">
                0&nbsp;F<span className="price-card__period"> /mois</span>
              </p>
              <p className="price-card__ht">Pour toujours</p>
              <ul>
                <li>Ta fiche existe parce que la Meute t'a trouvé</li>
                <li>Infos de base : horaires, position, photos</li>
                <li>Tu vois ce qui se dit, sans répondre</li>
              </ul>
            </article>
            <article className="price-card price-card--featured">
              <span className="price-card__flag">Le plus choisi</span>
              <h3>Spawt Pro</h3>
              <p className="price-card__amount">
                15&nbsp;000&nbsp;F
                <span className="price-card__period"> HT /mois</span>
              </p>
              <p className="price-card__ht">+ TVA 18&nbsp;%</p>
              <ul>
                <li>Badge Vérifié sur ta fiche</li>
                <li>Réponse aux avis, au nom du lieu</li>
                <li>Le Carnet : tes actus poussées à la Meute</li>
                <li>Stats de base (visites, spawts, notes)</li>
              </ul>
              <p className="price-card__ht">
                Souscription en ligne après vérification de ton lieu.
              </p>
            </article>
            <article className="price-card">
              <h3>Spawt Gold</h3>
              <p className="price-card__amount">
                65&nbsp;000&nbsp;F
                <span className="price-card__period"> HT /mois</span>
              </p>
              <p className="price-card__ht">+ TVA 18&nbsp;%</p>
              <ul>
                <li>Analytics avancés (tendances, heures chaudes)</li>
                <li>Ciblage par archétype de spawter</li>
                <li>Benchmark face aux lieux comparables</li>
              </ul>
              <p className="price-card__ht">
                Souscription en ligne après vérification de ton lieu.
              </p>
            </article>
          </div>
          <p style={{ marginTop: "var(--sp-lg)" }}>
            Une fois ton lieu vérifié et relié par l'équipe, la souscription Pro
            ou Gold se paie directement en ligne depuis ton tableau de bord
            (Orange Money, Wave, MTN MoMo). Ton lieu n'est pas encore sur
            SPAWT&nbsp;?{" "}
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Mon lieu sur SPAWT")}`}>
              Écris-nous
            </a>{" "}
            — on te rappelle vite.
          </p>
        </div>
      </section>

      <section className="section section--warm" aria-labelledby="pro-connexion">
        <div className="container container--narrow">
          <h2 className="section-title" id="pro-connexion">
            Déjà relié&nbsp;?
          </h2>
          <p>
            L'espace lieux utilise la même connexion que l'app&nbsp;: ton numéro,
            un code SMS. Si ton numéro est relié à un lieu, ton tableau de bord
            t'attend.
          </p>
          <Link className="btn btn--night" to={dashboardHref}>
            Me connecter à mon espace
          </Link>
        </div>
      </section>
    </>
  );
}
