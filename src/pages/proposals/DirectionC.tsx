import { useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router";
import StoreBadges from "../../components/StoreBadges";
import { BrandLogo, logoForSite } from "../../components/Layout";
import { useAndroidRelease } from "../../lib/android-release";
import { AndroidReleasePending } from "../../components/ApkDownload";
import { QUIZ_URL } from "../../lib/config";
import { PUBLISHED_COPY, usePublicBrand, usePublicMascot } from "../../lib/public-brand";
import { usePageTitle } from "../../lib/use-page-title";
import { LivePlaces } from "./Discovery";
import { ReferenceFood, ReferenceLettering, ReferenceMoka } from "./ReferenceArtwork";
import "../../styles/direction-c.css";
import "../../styles/reference-fidelity.css";

export function ShowcaseHeader() {
  const brand = usePublicBrand();
  return <header className="sc-header">
    <Link className="sc-logo" to="/" aria-label={`${brand.name} — accueil`}><BrandLogo key={brand.logoUrl} url={logoForSite(brand.logoUrl)} alt={`${brand.name} — ${brand.title}`} /></Link>
    <nav aria-label="Navigation principale"><Link to="/carte">La carte</Link><a href={QUIZ_URL}>Mon Palais</a><a className="sc-nav-download" href="#telecharger">Télécharger</a></nav>
  </header>;
}

function DownloadAction() {
  const release = useAndroidRelease();
  if (!release) return <AndroidReleasePending failed={release === null} />;
  const url = release.url;
  return <div className="sc-install">
    <a className="sc-primary" href={url} download={release.fileName} aria-label={`Télécharger SPAWT pour Android, APK version ${release.version}, build ${release.build}`}><svg className="sc-android-robot" viewBox="0 0 24 28" aria-hidden="true" fill="currentColor"><path d="M7 5 5.5 2.5M17 5l1.5-2.5" stroke="currentColor" strokeWidth="1"/><path fillRule="evenodd" d="M5 11a7 7 0 0 1 14 0H5Zm4-5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Zm6 0a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"/><rect x="5" y="12" width="14" height="10" rx="1.5"/><rect x="1" y="12" width="3" height="10" rx="1.5"/><rect x="20" y="12" width="3" height="10" rx="1.5"/><rect x="7" y="20" width="3" height="7" rx="1.5"/><rect x="14" y="20" width="3" height="7" rx="1.5"/></svg><span>Télécharger l’app</span><span aria-hidden="true">→</span></a>
    <p>Android · Gratuit</p>
  </div>;
}

const sceneNames = ["À table", "Moka", "Le Palais"];
export function ShowcaseHero() {
  const brand = usePublicBrand();
  const greeting = usePublicMascot("greeting", "/brand/moka-salut.webp", "Moka te salue de la patte");
  const guide = usePublicMascot("guide", "/brand/moka-carte.webp", "Moka explore une carte");
  const [scene, setScene] = useState(0);
  const touch = useRef<number | null>(null);
  function move(by: number) { setScene(current => (current + by + sceneNames.length) % sceneNames.length); }
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(event.key === "ArrowLeft" ? -1 : 1); }
  }
  return <section className="sc-hero-frame" aria-labelledby="sc-title">
    <div className="sc-hero">
      <div className="sc-hero-copy">
        <p className="sc-location">Abidjan, on passe à table ?</p>
        <h1 id="sc-title">{brand.title === "La carte du bon goût" ? <><span className="sc-readable-copy">La carte du bon goût.</span><ReferenceLettering kind="heading" /></> : brand.title}</h1>
        <p className="sc-signature">{brand.tagline === PUBLISHED_COPY.tagline ? <><span className="sc-readable-copy sc-signature-copy">{brand.tagline}</span><ReferenceLettering kind="signature" /></> : brand.tagline}</p>
        <p className="sc-intro">Découvre les spots d’Abidjan et trouve<br className="sc-desktop-break" /> ta prochaine bonne adresse.</p>
        <div className="sc-actions"><DownloadAction /><Link className="sc-web-link" to="/carte">Explorer la carte</Link></div>
      </div>
      <section className="sc-scenes" data-scene={scene} aria-label="L’univers SPAWT" aria-roledescription="carrousel" tabIndex={0} onKeyDown={keyboard}>
        <div className="sc-scene-stage" onTouchStart={event => { touch.current = event.touches[0]?.clientX ?? null; }} onTouchEnd={event => { const end = event.changedTouches[0]?.clientX; if (touch.current !== null && end !== undefined && Math.abs(end - touch.current) > 45) move(end < touch.current ? 1 : -1); touch.current = null; }} onTouchCancel={() => { touch.current = null; }}>
          <figure className="sc-scene sc-scene--food" hidden={scene !== 0} role="group" aria-roledescription="diapositive" aria-label="1 sur 3 : À table">
            <ReferenceFood />
          </figure>
          <div className="sc-scene sc-scene--moka" hidden={scene !== 1} role="group" aria-roledescription="diapositive" aria-label="2 sur 3 : Moka">
            <div><p>Curieux comme toi.</p><h2>Salut,<br />c’est <br className="sc-mobile-break" />Moka.</h2></div>
            <img {...greeting} width="340" height="489" />
            <p className="sc-scene-note">Ton compagnon de découverte.</p>
          </div>
          <div className="sc-scene sc-scene--palais" hidden={scene !== 2} role="group" aria-roledescription="diapositive" aria-label="3 sur 3 : Le Palais">
            <div><p>Le goût commence par toi.</p><h2>À chacun<br />son <br className="sc-mobile-break" />Palais.</h2><a href={QUIZ_URL}>Découvrir mes goûts <span aria-hidden="true">↗</span></a></div>
            <img {...guide} width="450" height="450" />
          </div>
        </div>
        <div className="sc-carousel-bar">
          <button className="sc-carousel-arrow" onClick={() => move(-1)} aria-label="Visuel précédent">←</button>
          <span className="sc-scene-count" aria-live="polite">{String(scene + 1).padStart(2, "0")} <span>/ 03</span></span>
          <button className="sc-carousel-arrow" onClick={() => move(1)} aria-label="Visuel suivant">→</button>
          <div className="sc-scene-tabs">{sceneNames.map((name, i) => <button key={name} aria-pressed={scene === i} aria-label={`Afficher : ${name}`} onClick={() => setScene(i)}>{name}</button>)}</div>
        </div>
        <a className="sc-image-credit" href="#credit-photo" hidden={scene !== 0}><span className="sc-readable-copy">Crédits visuels : référence photographique Shourav Sheikh</span></a>
      </section>
    </div>
  </section>;
}

export default function DirectionC() {
  const brand = usePublicBrand();
  const curious = usePublicMascot("curious", "/brand/moka-curieux.webp", "Moka réfléchit à ta prochaine découverte");
  const greeting = usePublicMascot("greeting", "/brand/moka-salut.webp", "Moka, ton compagnon de découverte");
  usePageTitle(brand.title);
  return <div className="showcase">
    <ShowcaseHero />
    <section className="sc-welcome" aria-labelledby="sc-welcome-title">
      <svg className="sc-wave" viewBox="0 0 1586 100" preserveAspectRatio="none" aria-hidden="true"><path d="M0 30 C130 -2 220 58 400 47 C610 31 720 30 920 62 C1150 100 1370 98 1586 78 V100 H0Z" /></svg>
      <div className="sc-welcome-inner sc-width">
        <div className="sc-welcome-moka">{brand.identity?.mascots.some(mascot => mascot.role === "greeting") ? <img {...greeting} width="340" height="489" /> : <ReferenceMoka />}</div>
        <h2 id="sc-welcome-title"><span className="sc-readable-copy">Le bon goût se partage.</span><ReferenceLettering kind="sharing" /></h2>
      </div>
      {brand.identity?.voice && <blockquote className="sc-brand-voice sc-width">{brand.identity.voice.quote}<cite>{brand.identity.voice.attribution}</cite></blockquote>}
    </section>
    <section className="sc-explore sc-width" aria-labelledby="sc-explore-title">
      <div className="sc-section-heading"><div><p>La ville a de quoi te surprendre.</p><h2 id="sc-explore-title">Et si on changeait<br />d’adresse ?</h2></div><Link to="/carte">Explorer les spots <span aria-hidden="true">↗</span></Link></div>
      <LivePlaces limit={3} />
    </section>
    <section className="sc-palais" aria-labelledby="sc-palais-title"><div className="sc-width sc-palais-inner">
      <div className="sc-palais-art"><img {...curious} width="352" height="508" /></div>
      <div className="sc-palais-copy"><h2 id="sc-palais-title">Tes goûts ont<br />leur mot à dire.</h2><p>Plutôt tes classiques ou de nouvelles saveurs ?<br />Six questions pour mettre des mots sur ce que tu aimes.</p><a href={QUIZ_URL}>Découvrir mon Palais <span aria-hidden="true">↗</span></a></div>
      <div className="sc-palais-pattern" aria-hidden="true" />
    </div></section>
    <section className="sc-download sc-width" id="telecharger" aria-labelledby="sc-download-title"><img className="sc-download-icon" src="/brand/pin.webp" alt="Emblème SPAWT" width="129" height="200" /><div><h2 id="sc-download-title">Abidjan dans ta poche.</h2><p>Emporte tes envies de découverte avec toi.</p><StoreBadges downloadOrigin="https://spawt.online" /></div></section>
    <div className="sc-photo-source sc-width" id="credit-photo">Composition culinaire générée avec ImageGen, d’après une photographie de <a href="https://www.pexels.com/photo/grilled-chicken-on-a-plate-5695611/" target="_blank" rel="noreferrer">Shourav Sheikh / Pexels</a> (<a href="https://www.pexels.com/license/" target="_blank" rel="noreferrer">licence</a>). Visuel d’ambiance, sans lien avec un établissement du catalogue.</div>
  </div>;
}
