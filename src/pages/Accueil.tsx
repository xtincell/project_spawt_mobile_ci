import { useEffect } from "react";
import { LeChaReview } from "../components/LeChaReview";
import { PilotResume } from "../components/PilotResume";
import { usePilotJourney } from "../lib/pilot-journey";
import { Link, useLocation } from "react-router";
import ApkDownload from "../components/ApkDownload";
import { BrandLogo, logoForSite } from "../components/Layout";
import { QUIZ_URL } from "../lib/config";
import { usePublicBrand, usePublicMascot } from "../lib/public-brand";
import { usePageTitle } from "../lib/use-page-title";
import EveningHero from "./proposals/EveningHero";

import "../styles/accueil.css";

export function AccueilHeader() {
  const brand = usePublicBrand();
  return <header className="accueil-header">
    <a className="accueil-skip" href="#contenu-accueil">Aller au contenu</a>
    <Link className="accueil-logo" to="/" aria-label="SPAWT — accueil">
      <BrandLogo key={brand.logoUrl} url={logoForSite(brand.logoUrl)} alt={brand.name} />
    </Link>
    <nav aria-label="Navigation principale">
      <Link to="/carte">La carte</Link>
      <a href={QUIZ_URL}>Mon Palais</a>
    </nav>
  </header>;
}

export default function Accueil() {
  const location = useLocation();
  return <AccueilContent key={location.search} />;
}

function AccueilContent() {
  const brand = usePublicBrand();
  const curious = usePublicMascot("curious", "/brand/moka-curieux.webp", "Moka, le chat calico de SPAWT");
  const location = useLocation();
  const journey = usePilotJourney(location.search);
  usePageTitle(brand.title);
  useEffect(() => {
    if (location.hash === "#telecharger") window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.hash]);
  const download = <ApkDownload className="accueil-apk" onDownload={journey.startDownload} />;
  return <div className="accueil" id="contenu-accueil" tabIndex={-1}>
    <div id="telecharger"><EveningHero initialSpot={journey.entry.source === "unknown" ? "marcory" : "in-concept"} download={download} /></div>
    {journey.clicked && <button className="pilot-code-return" onClick={() => journey.setShowResume(true)}>Retrouver mon code de reprise</button>}
    <PilotResume journey={journey} />

    <a className="accueil-ruban" href="#mon-palais">
      <img src="/brand/accueil/diorama-moka.webp" width="180" height="98" alt="" />
      <span>Suis ton Palais<b>.</b></span>
      <img className="accueil-nav-icon" src="/brand/accueil/suivant.png" alt="" />
    </a>


    <LeChaReview />

    <section className="accueil-palais" id="mon-palais" aria-labelledby="palais-titre">
      <div className="accueil-palais-texte">
        <h2 id="palais-titre">À chacun<br />son Palais<b>.</b></h2>
        <p>Tu retournes au même maquis pour son braisé ou tu changes de quartier à chaque sortie&nbsp;? Découvre ce que tes envies disent de toi.</p>
        <a className="accueil-lien" href={QUIZ_URL}>Découvrir mon Palais <img className="accueil-nav-icon" src="/brand/accueil/suivant.png" alt="" /></a>
      </div>
      <figure className="accueil-carte-palais">
        <span className="accueil-carte-type">Archétype du Palais</span>
        <img {...curious} loading="lazy" decoding="async" width="352" height="508" />
        <figcaption><strong>Pisteur</strong><span>Nomade × Maquis</span></figcaption>
      </figure>
    </section>

    <section className="accueil-installer" aria-labelledby="installer-titre">
      <div className="accueil-installer-texte">
        <img src="/brand/pin.webp" width="129" height="200" alt="" loading="lazy" />
        <div><h2 id="installer-titre">Abidjan dans ta poche<b>.</b></h2>
          <p>Emporte la carte et retrouve ton prochain spawt.</p></div>
      </div>
      <div className="accueil-installer-action">
        {download}
      </div>
    </section>
  </div>;
}
