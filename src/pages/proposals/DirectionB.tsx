import { Link } from "react-router";
import StoreBadges from "../../components/StoreBadges";
import { QUIZ_URL } from "../../lib/config";
import { usePublicBrand, usePublicMascot } from "../../lib/public-brand";
import { usePageTitle } from "../../lib/use-page-title";
import { LivePlaces } from "./Discovery";
import { PhotoCredit } from "./PhotoCredit";
import { BrandHero } from "./BrandHero";
import "../../styles/direction-b.css";

function Arrow({ diagonal = false }: { diagonal?: boolean }) {
  return <span aria-hidden="true">{diagonal ? "↗" : "→"}</span>;
}

export default function DirectionB() {
  const brand = usePublicBrand();
  const curious = usePublicMascot("curious", "/brand/moka-curieux.webp", "Moka, le chat calico de SPAWT, regarde avec curiosité");
  usePageTitle(brand.title);

  return (
    <div className="direction-b">
      <BrandHero variant="warm" />
      <section className="db-opening" aria-labelledby="db-discovery-title">
        <div className="db-wrap">
          <div id="db-adresses" className="db-discover">
            <div className="db-addresses">
              <p className="db-label"><span>01</span> Le goût de sortir</p>
              <h2 id="db-discovery-title">Quelques spots<br />pour te donner envie.</h2>
              <LivePlaces limit={3} />
            </div>
            <figure className="db-food">
              <div className="db-food-image">
                <img
                  src="/brand/editorial/attieke-reel.webp"
                  alt="Sole braisée et attiéké servis à table à Abidjan"
                  width={1536}
                  height={1024}
                  loading="lazy"
                />
                <span className="db-food-note">Ça donne<br />des idées.</span>
              </div>
              <PhotoCredit photo="hero" />
            </figure>
          </div>

          <div className="db-map-callout">
            <p>À chaque sortie, une nouvelle piste.</p>
            <Link className="db-text-link" to="/carte">Voir la carte <Arrow /></Link>
          </div>
        </div>
      </section>

      <section className="db-palais" aria-labelledby="db-palais-title">
        <div className="db-wrap db-palais-inner">
          <div className="db-palais-copy">
            <p className="db-label"><span>02</span> Ton Palais</p>
            <h2 id="db-palais-title">Tes goûts ont<br />leur mot à dire.</h2>
            <p>Plutôt tes classiques ou de nouvelles saveurs ? Le quiz du Palais t’aide à mettre des mots sur tes goûts.</p>
            <a className="db-button db-button--light" href={QUIZ_URL}>Découvrir mon Palais <Arrow diagonal /></a>
          </div>
          <div className="db-moka-portrait">
            <span className="db-moka-aside">« Alors, on mange où ? »</span>
            <img {...curious} width={352} height={508} loading="lazy" />
            <span className="db-moka-name">Moka<br /><span>Ton compagnon de découverte</span></span>
          </div>
        </div>
      </section>

      <figure className="db-table db-wrap">
        <div className="db-table-image">
          <img
            src="/brand/editorial/alloco-reel.webp"
            alt="Service d’alloco et de claco en Côte d’Ivoire"
            width={1536}
            height={1024}
            loading="lazy"
          />
        </div>
        <PhotoCredit photo="detail" />
      </figure>

      <section className="db-download db-wrap" aria-labelledby="db-download-title">
        <div className="db-download-heading">
          <p className="db-label"><span>03</span> À emporter</p>
          <h2 id="db-download-title">Abidjan t’attend.<br />Garde SPAWT avec toi.</h2>
        </div>
        <div className="db-download-content">
          <p>SPAWT est gratuit pour les spawters. Télécharge l’application et donne une suite à tes envies.</p>
          <StoreBadges downloadOrigin="https://spawt.online" />
          <p className="db-download-note">Tu peux aussi commencer ici, avec <Link to="/carte">la carte des spots</Link>.</p>
        </div>
      </section>
    </div>
  );
}
