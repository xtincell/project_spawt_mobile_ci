import { useEffect, useState } from "react";
import { LeChaReview } from "../components/LeChaReview";
import { PilotResume } from "../components/PilotResume";
import { usePilotJourney } from "../lib/pilot-journey";
import { Link, useLocation } from "react-router";
import ApkDownload from "../components/ApkDownload";
import { installDevice } from "../lib/install-device";
import { BrandLogo, logoForSite } from "../components/Layout";
import { InsideSpawt } from "../components/InsideSpawt";
import { CityStory, PalaisStory } from "../components/AccueilStory";
import { usePublicBrand } from "../lib/public-brand";
import { usePageTitle } from "../lib/use-page-title";
import EveningHero from "./proposals/EveningHero";

import "../styles/accueil.css";
import "../styles/accueil-story.css";

export function AccueilHeader() {
  const brand = usePublicBrand();
  return <header className="accueil-header">
    <a className="accueil-skip" href="#contenu-accueil">Aller au contenu</a>
    <Link className="accueil-logo" to="/" aria-label="SPAWT — accueil">
      <BrandLogo key={brand.logoUrl} url={logoForSite(brand.logoUrl)} alt={brand.name} />
    </Link>
    <nav aria-label="Navigation principale">
      <a href="/#dans-spawt">Dans l’app</a>
      <a href="/#le-cha">La Bande</a>
    </nav>
  </header>;
}

export default function Accueil() {
  const location = useLocation();
  return <AccueilContent key={location.search} />;
}

function AccueilContent() {
  const brand = usePublicBrand();
  const location = useLocation();
  const journey = usePilotJourney(location.search);
  const [transferPanel, setTransferPanel] = useState<HTMLDivElement | null>(null);
  usePageTitle(brand.title);
  useEffect(() => {
    if (location.hash === "#telecharger") window.scrollTo({ top: 0, behavior: "instant" });
  }, [location.hash]);
  const download = <ApkDownload className="accueil-apk" onDownload={journey.startDownload} onReceived={journey.reportApkReceived} transferPanel={transferPanel} />;
  return <div className="accueil" id="contenu-accueil" tabIndex={-1}>
    <div id="telecharger"><EveningHero initialSpot={journey.entry.source === "unknown" ? "marcory" : "in-concept"} download={download} /></div>
    {journey.clicked && <button className="pilot-code-return" onClick={() => journey.setShowResume(true)}>Retrouver mon code de reprise</button>}
    <PilotResume journey={journey} transferPanelRef={setTransferPanel} />

    <a className="accueil-ruban" href="#mon-palais">
      <img src="/brand/accueil/diorama-moka.webp" width="180" height="98" alt="" />
      <span>Suis ton Palais<b>.</b></span>
      <img className="accueil-nav-icon" src="/brand/accueil/suivant.png" alt="" />
    </a>


    <CityStory />
    <InsideSpawt />
    <LeChaReview />
    <PalaisStory />

    <section className="accueil-installer" aria-labelledby="installer-titre">
      <div className="accueil-installer-texte">
        <img src="/brand/pin.webp" width="129" height="200" alt="" loading="lazy" />
        <div><h2 id="installer-titre">Abidjan dans ta poche<b>.</b></h2>
          <p>Télécharge SPAWT et choisis où retrouver la Bande.</p></div>
      </div>
      <div className="installer-options">
        {installDevice() === "desktop" && <figure className="installer-qr">
          <img src={"/brand/install/qr-" + journey.entry.source + ".png"} width="132" height="132" alt="QR code vers le téléchargement sur Android" loading="lazy" />
          <figcaption>Scanner avec ton Android</figcaption>
        </figure>}
        <div className="accueil-installer-action">{download}</div>
      </div>
    </section>
  </div>;
}
