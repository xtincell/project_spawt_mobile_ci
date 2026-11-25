import { Link } from "react-router";
import ApkDownload from "./ApkDownload";
import review from "../lib/le-cha-review.json";
import "../styles/le-cha-review.css";

const publicPath = "/ouvrir/avis/le-cha-alexandre";
const androidIntent = "intent://spawt.online" + publicPath + "#Intent;scheme=https;package=com.upgraders.spawt;S.browser_fallback_url=" + encodeURIComponent("https://spawt.online" + publicPath + "#installer") + ";end";
const average = review.ratings.reduce((total, rating) => total + rating.value, 0) / review.ratings.length;

export function LeChaReview({ reader = false }: { reader?: boolean }) {
  const android = /Android/i.test(navigator.userAgent);
  const Heading = reader ? "h1" : "h2";
  return (
    <section id="le-cha" className="lecha" aria-labelledby="lecha-heading">
      <div className="lecha-layout">
        <Heading id="lecha-heading">{reader ? "L’avis d’Alexandre" : "Les trouvailles de la Bande"}<b>.</b></Heading>
        <figure className="lecha-experience">
          <img className="lecha-photo" src="/brand/editorial/lecha-table-960.webp"
            srcSet="/brand/editorial/lecha-table-480.webp 480w, /brand/editorial/lecha-table-960.webp 960w"
            sizes="(max-width: 760px) 100vw, (max-width: 1250px) 52vw, 620px" width={960} height={1280}
            loading={reader ? "eager" : "lazy"} decoding="async" alt={review.photoAlt} />
          <figcaption>À table chez Le Cha <span>Photo d’Alexandre</span></figcaption>
        </figure>
        <article className="lecha-card" aria-label="Avis d’Alexandre sur Le Cha">
          <header className="lecha-card__head">
            <img className="lecha-front" src="/brand/editorial/le-cha-devanture.webp" width={75} height={88} alt={review.frontAlt} />
            <div><h3>{review.name}</h3><span className="lecha-city">{review.area} · {review.city}</span></div>
            <span className="lecha-score" aria-label={`Note globale : ${average} sur 5`}>{average}<small>/5</small></span>
          </header>
          <div className="lecha-author">
            <span className="lecha-avatar"><img src="/brand/moka-salut.webp" alt="" width={40} height={40} loading="lazy" /></span>
            <span><strong>{review.author}</strong><small>{review.stage}</small></span>
          </div>
          <blockquote>« {review.quote} »</blockquote>
          <dl className="lecha-ratings">
            {review.ratings.map(({ label, value }) => (
              <div key={label}><dt>{label}</dt><dd>{value}<span>/5</span></dd></div>
            ))}
          </dl>
          {(!reader || android) && <a className="lecha-open" href={reader ? androidIntent : publicPath}>
            {reader ? "Ouvrir dans SPAWT" : "Lire l’avis dans SPAWT"}
            <img src="/brand/accueil/suivant.png" alt="" width={16} height={16} />
          </a>}
          {reader && <div id="installer" className="lecha-install"><ApkDownload className="accueil-lien" /></div>}
        </article>
        <Link className="accueil-lien lecha-map-link" to={reader ? `/carte?lieu=${review.placeId}` : "/carte"}>
          {reader ? "Voir la fiche de Le Cha" : "Explorer les adresses d’Abidjan"} <img className="accueil-nav-icon" src="/brand/accueil/suivant.png" alt="" />
        </Link>
      </div>
    </section>
  );
}
