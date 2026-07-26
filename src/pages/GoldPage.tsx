// /gold — pitch de l'abonnement Spawter Gold + tarifs TTC + FAQ.
// Modèle Spotify/Netflix : AUCUN achat dans l'app mobile, tout se paie ici.
// CTA : connecté → /gold/paiement, sinon → /connexion?next=/gold/paiement.

import { Link } from "react-router";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

export default function GoldPage() {
  usePageTitle("Spawter Gold");
  const { session } = useAuth();
  const checkoutHref = session
    ? "/gold/paiement"
    : `/connexion?next=${encodeURIComponent("/gold/paiement")}`;

  return (
    <>
      <section className="hero" style={{ paddingBlock: "var(--sp-2xl)" }}>
        <div className="container">
          <p className="section-kicker">Spawter Gold</p>
          <h1 className="hero__title" style={{ fontSize: "clamp(2rem, 7vw, 3.2rem)" }}>
            Tout Abidjan, déverrouillé
          </h1>
          <p className="hero__pitch">
            Ton Palais connaît ton quartier par cœur. Gold lui ouvre toute la
            ville.
          </p>
          <div className="hero__actions">
            <Link className="btn btn--gold" to={checkoutHref}>
              Passer Gold
            </Link>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="gold-avantages">
        <div className="container">
          <h2 className="section-title" id="gold-avantages">
            Ce que Gold débloque
          </h2>
          <div className="card-grid card-grid--3">
            <article className="card">
              <div className="card__icon" aria-hidden="true">🗺️</div>
              <h3>Tout Abidjan</h3>
              <p>
                Fini le rayon limité&nbsp;: 100&nbsp;% du contenu, de Yopougon à
                Bingerville. Chaque spot, chaque trouvaille de la Meute.
              </p>
            </article>
            <article className="card">
              <div className="card__icon" aria-hidden="true">👅</div>
              <h3>Palais complet</h3>
              <p>
                Les 5 axes de ton Palais + tout ton historique. Tu vois enfin ce
                que ton instinct sait déjà.
              </p>
            </article>
            <article className="card">
              <div className="card__icon" aria-hidden="true">✨</div>
              <h3>Badge doré + Coup de Cœur</h3>
              <p>
                Le badge doré sur ton profil, et +1 Coup de Cœur — le vote rare
                qui fait vraiment bouger un lieu.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="section section--warm" aria-labelledby="gold-tarifs">
        <div className="container">
          <h2 className="section-title" id="gold-tarifs">
            Le prix, sans étoile ni astérisque
          </h2>
          <div className="card-grid card-grid--2">
            <article className="price-card">
              <h3>Mensuel</h3>
              <p className="price-card__amount">
                2&nbsp;950&nbsp;F&nbsp;CFA
                <span className="price-card__period"> /mois TTC</span>
              </p>
              <p className="price-card__ht">soit 2&nbsp;500&nbsp;F CFA HT + TVA 18&nbsp;%</p>
              <ul>
                <li>Sans engagement — tu arrêtes quand tu veux</li>
                <li>Orange Money, Wave, MTN MoMo</li>
              </ul>
              <Link className="btn btn--night btn--block" to={checkoutHref}>
                Choisir le mensuel
              </Link>
            </article>
            <article className="price-card price-card--featured">
              <span className="price-card__flag">2 mois offerts</span>
              <h3>Annuel</h3>
              <p className="price-card__amount">
                29&nbsp;500&nbsp;F&nbsp;CFA
                <span className="price-card__period"> /an TTC</span>
              </p>
              <p className="price-card__ht">soit 25&nbsp;000&nbsp;F CFA HT + TVA 18&nbsp;%</p>
              <ul>
                <li>12 mois au prix de 10</li>
                <li>Un seul paiement, zéro rappel pendant un an</li>
              </ul>
              <Link className="btn btn--gold btn--block" to={checkoutHref}>
                Choisir l'annuel
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section" aria-labelledby="gold-faq">
        <div className="container container--narrow faq">
          <h2 className="section-title" id="gold-faq">
            Les questions qu'on nous pose
          </h2>
          <details>
            <summary>Pourquoi payer ici et pas dans l'app&nbsp;?</summary>
            <p>
              Même logique que Spotify ou Netflix&nbsp;: l'abonnement se prend
              sur le web, l'app sert à en profiter. Ça nous évite les commissions
              des stores — et ça te garantit le vrai prix, sans surcoût caché.
            </p>
          </details>
          <details>
            <summary>Le Mobile Money va-t-il prélever tout seul&nbsp;?</summary>
            <p>
              Non. Le Mobile Money ne prélève pas tout seul&nbsp;: on te rappelle
              à J-3 puis le jour J pour renouveler, et tu gardes 7 jours de grâce
              après l'échéance. Tu restes maître de ton argent, toujours.
            </p>
          </details>
          <details>
            <summary>Quels moyens de paiement&nbsp;?</summary>
            <p>
              Orange Money, Wave et MTN MoMo, via notre partenaire de paiement
              CinetPay. Tu valides sur ton téléphone, comme d'habitude.
            </p>
          </details>
          <details>
            <summary>Et si je change d'avis&nbsp;?</summary>
            <p>
              Le mensuel est sans engagement&nbsp;: tu ne renouvelles pas, c'est
              tout. Pour l'annuel, tu disposes d'un droit de rétractation de 7
              jours (cf. <Link to="/legal/cgv">CGV</Link>).
            </p>
          </details>
          <details>
            <summary>Comment l'app sait que je suis Gold&nbsp;?</summary>
            <p>
              Tu te connectes ici avec le même numéro que dans l'app. Dès le
              paiement validé, ton compte passe Gold partout — rouvre l'app et
              c'est déjà là.
            </p>
          </details>
        </div>
      </section>
    </>
  );
}
