import { Link } from "react-router";
import StoreBadges from "../../components/StoreBadges";
import { QUIZ_URL } from "../../lib/config";
import { usePublicBrand, usePublicMascot } from "../../lib/public-brand";
import { usePageTitle } from "../../lib/use-page-title";
import { LivePlaces } from "./Discovery";
import { PhotoCredit } from "./PhotoCredit";
import { BrandHero } from "./BrandHero";
import "../../styles/direction-a.css";

export default function DirectionA() {
  const brand = usePublicBrand();
  const moka = usePublicMascot("curious", "/brand/moka-curieux.webp", "Moka, le chat curieux de SPAWT");
  usePageTitle(brand.title);
  return <div className="direction-a">
    <BrandHero variant="dark" />
    <section className="da-addresses da-wrap" id="da-spots" aria-labelledby="da-spots-title">
      <div className="da-section-heading"><div><p className="da-kicker">Commence ici</p><h2 id="da-spots-title">Ta prochaine sortie<br />a peut-être une adresse.</h2></div><Link className="da-text-link" to="/carte">Toute la carte <span aria-hidden="true">↗</span></Link></div>
      <LivePlaces />
    </section>
    <section className="da-taste" aria-labelledby="da-taste-title">
      <figure className="da-taste-photo"><img src="/brand/editorial/alloco-reel.webp" alt="Cuisine ivoirienne photographiée en Côte d’Ivoire" width="1200" height="900" loading="lazy" /><PhotoCredit photo="detail" /></figure>
      <div className="da-taste-copy"><p className="da-kicker">À chacun son envie</p><h2 id="da-taste-title">Le bon goût,<br />ça commence<br />par le tien.</h2><p>Une envie de braisé, un déjeuner dans ton quartier, une table à découvrir à plusieurs. Explore les adresses selon ce qui te fait envie.</p><Link className="da-text-link" to="/carte">Explorer les spots <span aria-hidden="true">↗</span></Link></div>
    </section>
    <section className="da-palais da-wrap" aria-labelledby="da-palais-title"><div className="da-moka"><img {...moka} width="352" height="508" loading="lazy" /><span>Moka · Curieux comme toi.</span></div><div><p className="da-kicker">Ton Palais</p><h2 id="da-palais-title">On parle<br />de tes goûts ?</h2><p>Le Palais, c’est ton profil de goût. Avec le quiz, mets des mots sur ce que tu aimes et ce qui te donne envie de découvrir.</p><a className="da-button da-button--green" href={QUIZ_URL}>Découvrir mon Palais <span aria-hidden="true">↗</span></a></div></section>
    <section className="da-download" aria-labelledby="da-download-title"><div className="da-wrap da-download-inner"><div><p className="da-kicker">SPAWT dans ta poche</p><h2 id="da-download-title">La prochaine fois,<br />tu sauras où chercher.</h2><p>L’application est gratuite pour les spawters.</p></div><div><StoreBadges downloadOrigin="https://spawt.online" /><Link className="da-text-link" to="/carte">Ou explore la carte sur le web <span aria-hidden="true">↗</span></Link></div></div></section>
  </div>;
}
