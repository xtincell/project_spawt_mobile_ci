import { useRef, useState, type KeyboardEvent } from "react";
import { Link } from "react-router";
import StoreBadges from "../../components/StoreBadges";
import { usePublicBrand, usePublicMascot } from "../../lib/public-brand";
import { QUIZ_URL } from "../../lib/config";
import { PhotoCredit } from "./PhotoCredit";
import "../../styles/brand-hero.css";

const panels = ["Moka", "À table", "Le Palais"];

export function BrandHero({ variant = "warm" }: { variant?: "warm" | "dark" }) {
  const brand = usePublicBrand();
  const greeting = usePublicMascot("greeting", "/brand/moka-salut.webp", "Moka te salue de la patte");
  const guide = usePublicMascot("guide", "/brand/moka-carte.webp", "Moka explore une carte");
  const [active, setActive] = useState(0);
  const touchStart = useRef<number | null>(null);
  const change = (delta: number) => setActive(current => (current + delta + panels.length) % panels.length);
  function keyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      event.preventDefault(); change(event.key === "ArrowRight" ? 1 : -1);
    }
  }
  return <section className={`brand-hero brand-hero--${variant}`} aria-labelledby="brand-hero-title">
    <div className="brand-hero__inner">
      <div className="brand-hero__heading">
        <p className="brand-hero__eyebrow">L’app pour tes sorties à Abidjan</p>
        <h1 id="brand-hero-title">{brand.title}</h1>
        <p className="brand-hero__signature">{brand.tagline}</p>
        <p className="brand-hero__description">Des lieux à découvrir, des goûts à explorer.<br className="brand-hero__desktop-break" /> Et Moka pour te tenir compagnie.</p>
      </div>

      <div className="brand-hero__actions">
        <p className="brand-hero__download-title">Emporte SPAWT avec toi.</p>
        <StoreBadges downloadOrigin="https://spawt.online" />
        <p className="brand-hero__availability">Gratuit pour les spawters. Android disponible, iOS à venir.</p>
        <Link className="brand-hero__web-link" to="/carte">Un premier tour sur la carte <span aria-hidden="true">↗</span></Link>
      </div>

      <section className="brand-hero__carousel" aria-label="L’univers SPAWT" aria-roledescription="carrousel" onKeyDown={keyboard} tabIndex={0}>
        <div className="brand-hero__stage"
          onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
          onTouchEnd={event => { const end = event.changedTouches[0]?.clientX; if (touchStart.current !== null && end !== undefined && Math.abs(end - touchStart.current) > 45) change(end < touchStart.current ? 1 : -1); touchStart.current = null; }}
          onTouchCancel={() => { touchStart.current = null; }}>
          <div className="brand-hero__panel brand-hero__welcome" role="group" aria-roledescription="diapositive" aria-label="1 sur 3 : Moka" hidden={active !== 0}>
            <div className="brand-hero__pattern" aria-hidden="true" />
            <div className="brand-hero__sun" aria-hidden="true" />
            <p className="brand-hero__hello">Alors,<br />on mange où ?</p>
            <img className="brand-hero__moka-main" {...greeting} width="340" height="489" loading="eager" />
            <img className="brand-hero__pin" src="/brand/decor/pin.svg" alt="" width="100" height="100" />
            <img className="brand-hero__duo" src="/brand/decor/duo.svg" alt="" width="100" height="72" />
            <p className="brand-hero__moka-label">Moka<span>Ton compagnon de découverte</span></p>
          </div>
          <div className="brand-hero__panel brand-hero__food" role="group" aria-roledescription="diapositive" aria-label="2 sur 3 : À table" hidden={active !== 1}>
            <div className="brand-hero__pattern" aria-hidden="true" />
            <p className="brand-hero__scene-title">Ça donne envie<br />de sortir.</p>
            <figure className="brand-hero__food-photo"><img src="/brand/editorial/attieke-reel.webp" alt="Sole braisée et attiéké à une vraie table d’Abidjan" width="1920" height="1080" loading="lazy" /><PhotoCredit photo="hero" /></figure>
            <img className="brand-hero__moka-food" src="/brand/decor/moka-regale.webp" alt="Moka se régale, une assiette à la patte" width="457" height="549" loading="lazy" />
          </div>
          <div className="brand-hero__panel brand-hero__palais" role="group" aria-roledescription="diapositive" aria-label="3 sur 3 : Le Palais" hidden={active !== 2}>
            <div className="brand-hero__pattern" aria-hidden="true" />
            <div className="brand-hero__sun" aria-hidden="true" />
            <p className="brand-hero__scene-title">Tes goûts ont<br />leur mot à dire.</p>
            <img className="brand-hero__moka-guide" {...guide} width="450" height="450" loading="lazy" />
            <a className="brand-hero__quiz" href={QUIZ_URL}>Découvrir mon Palais <span aria-hidden="true">↗</span></a>
          </div>
        </div>
        <div className="brand-hero__controls">
          <button className="brand-hero__arrow" aria-label="Visuel précédent" onClick={() => change(-1)}><span aria-hidden="true">←</span></button>
          <div className="brand-hero__choices">{panels.map((name, index) => <button key={name} aria-label={`Afficher : ${name}`} aria-pressed={active === index} onClick={() => setActive(index)}><span className="brand-hero__dot" aria-hidden="true" />{name}</button>)}</div>
          <button className="brand-hero__arrow" aria-label="Visuel suivant" onClick={() => change(1)}><span aria-hidden="true">→</span></button>
          <span className="brand-hero__sr-only" aria-live="polite">{active + 1} sur 3 : {panels[active]}</span>
        </div>
      </section>
    </div>
  </section>;
}
