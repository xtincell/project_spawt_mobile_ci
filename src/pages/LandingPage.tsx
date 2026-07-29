// Landing spawt.online — la vitrine. Héro (promesse), les 3 piliers
// (Instinct / Identité / Communauté), Le Guet, CTA stores + quiz archétype.
// Ton : direct, complice, tutoiement — jamais corporate.

import { Link } from "react-router";
import StoreBadges from "../components/StoreBadges";
import { QUIZ_URL } from "../lib/config";
import { usePageTitle } from "../lib/use-page-title";

export default function LandingPage() {
  usePageTitle("La carte du bon goût");

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1 className="hero__title">La carte du bon goût</h1>
          <p className="hero__promise">Ne plus jamais regretter un lieu.</p>
          <p className="hero__pitch">
            45 minutes de débat dans le groupe&nbsp;? Avec SPAWT&nbsp;: 3 minutes,
            trois taps, et ton crew est à table.
          </p>
          <div className="hero__actions">
            <StoreBadges />
            <a className="btn btn--ghost" href={QUIZ_URL} target="_blank" rel="noreferrer">
              Découvre ton archétype →
            </a>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="piliers-titre">
        <div className="container">
          <p className="section-kicker">Ce que SPAWT change</p>
          <h2 className="section-title" id="piliers-titre">
            Trois piliers, zéro blabla
          </h2>
          <div className="card-grid card-grid--3">
            <article className="card">
              <div className="card__icon" aria-hidden="true">
                👅
              </div>
              <h3>Instinct</h3>
              <p>
                Ton <strong>Palais</strong> apprend ce que tu aimes vraiment —
                pas ce que la moyenne aime. La reco qui sort, c'est «&nbsp;ce
                lieu-là, maintenant, pour toi&nbsp;».
              </p>
            </article>
            <article className="card">
              <div className="card__icon" aria-hidden="true">
                🐾
              </div>
              <h3>Identité</h3>
              <p>
                Ton <strong>archétype</strong> et ta collection racontent qui tu
                es à table. Tu ne consommes pas une app&nbsp;: tu te découvres à
                travers elle.
              </p>
            </article>
            <article className="card">
              <div className="card__icon" aria-hidden="true">
                🐺
              </div>
              <h3>Communauté</h3>
              <p>
                <strong>La Meute</strong> flaire, spawte et partage. Chaque
                trouvaille nourrit la carte — du maquis de quartier à la table
                qui brille.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section--night" aria-labelledby="guet-titre">
        <div className="container">
          <p className="section-kicker">Le Guet</p>
          <h2 className="section-title" id="guet-titre">
            Des spawts vérifiés, pas des on-dit
          </h2>
          <p style={{ maxWidth: "56ch" }}>
            Un avis SPAWT n'est pas un avis de passage&nbsp;: le Guet vérifie que
            le spawter était vraiment sur place. Résultat&nbsp;: une carte où
            chaque note a été mangée, pas imaginée. C'est ça, la différence entre
            du bruit et du bon goût.
          </p>
          <Link className="btn btn--gold" to="/gold">
            Débloquer tout Abidjan avec Gold
          </Link>
        </div>
      </section>

      <section className="section" aria-labelledby="ambassadeurs-titre">
        <div className="container container--narrow">
          <p className="section-kicker">Programme ambassadeur</p>
          <h2 className="section-title" id="ambassadeurs-titre">
            Deviens la voix de la Meute
          </h2>
          <p>
            Tu spawtes déjà, tu racontes déjà, ta communauté t'écoute déjà&nbsp;?
            Le programme ambassadeur te donne un micro — Gold offert, visibilité
            éditoriale, et une rétribution qui monte avec ton palier.
          </p>
          <Link className="btn btn--accent" to="/ambassadeurs">
            Découvrir les 3 paliers
          </Link>
        </div>
      </section>

      <section className="section section--warm" aria-labelledby="crew-titre">
        <div className="container">
          <h2 className="section-title" id="crew-titre">
            Ton crew mérite mieux que «&nbsp;on va où&nbsp;?&nbsp;»
          </h2>
          <div className="card-grid card-grid--2">
            <div className="card card--warm">
              <h3>Pour toi</h3>
              <p>
                Télécharge l'app, spawte tes premiers lieux, laisse ton Palais se
                construire. Gratuit dans ton rayon — et quand tu veux tout
                Abidjan, <Link to="/gold">Gold t'attend ici</Link>.
              </p>
            </div>
            <div className="card card--warm">
              <h3>Pour ton lieu</h3>
              <p>
                Maquis, table, spot de nuit&nbsp;: la Meute parle déjà de toi.
                <Link to="/pro"> Reprends la main sur ta fiche</Link> et comprends
                qui pousse ta porte.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
