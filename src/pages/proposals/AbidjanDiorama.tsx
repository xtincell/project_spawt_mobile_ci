import { useEffect, useRef } from "react";
import { Link } from "react-router";
import "../../styles/abidjan-diorama.css";

const panorama = "/brand/accueil/diorama-abidjan.webp";
const smallPanorama = "/brand/accueil/diorama-abidjan-compact.webp";
const quartiers = ["Marcory", "Yopougon", "Treichville"];

export default function AbidjanDiorama() {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const poster = useRef<HTMLImageElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const region = section.current;
    const viewport = stage.current;
    const surface = canvas.current;
    const image = poster.current;
    if (!region || !viewport || !surface || !image ||
        !window.IntersectionObserver || !window.matchMedia || !window.WebGL2RenderingContext) return;

    const enhanced = window.matchMedia("(min-width: 701px) and (prefers-reduced-motion: no-preference)");
    let close: (() => void) | undefined;
    let pending = false;
    let visible = false;
    let disposed = false;
    let version = 0;

    async function sync() {
      if (!viewport || !surface || !image) return;
      if (!visible || !enhanced.matches || document.hidden) {
        ++version;
        close?.();
        close = undefined;
        return;
      }
      if (pending || close || disposed) return;
      const revision = ++version;
      pending = true;
      try {
        const { mountAbidjanRelief } = await import("./abidjan-relief");
        await image.decode();
        if (!disposed && revision === version) close = mountAbidjanRelief(viewport, surface, image);
      } catch {
        surface.style.opacity = "0";
      } finally {
        pending = false;
        if (!disposed && revision !== version && visible && enhanced.matches && !document.hidden) void sync();
      }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      void sync();
    });
    observer.observe(region);
    enhanced.addEventListener("change", sync);
    document.addEventListener("visibilitychange", sync);
    return () => {
      disposed = true;
      ++version;
      observer.disconnect();
      enhanced.removeEventListener("change", sync);
      document.removeEventListener("visibilitychange", sync);
      close?.();
    };
  }, []);

  return (
    <section id="abidjan" className="abidjan-diorama" ref={section} aria-labelledby="abidjan-title">
      <div className="abidjan-diorama__intro">
        <div>
          <h2 id="abidjan-title">Abidjan à la carte<span>.</span></h2>
          <p>Suis ton envie du jour, quartier par quartier.</p>
        </div>
        <Link className="abidjan-diorama__map-link" to="/carte">Explorer la carte <span aria-hidden="true">↗</span></Link>
      </div>
      <div className="abidjan-diorama__frame">
        <div className="abidjan-diorama__stage" ref={stage}>
          <picture>
            <source media="(max-width: 1024px)" srcSet={smallPanorama} />
            <img ref={poster} src={panorama} width="2600" height="856" loading="lazy" decoding="async"
              alt="Abidjan en relief de papier. Ses ponts traversent la lagune et un repère doré indique le garba de Treichville." />
          </picture>
          <canvas aria-hidden="true" ref={canvas} />
          <img className="abidjan-diorama__moka" src="/brand/accueil/diorama-moka.webp" alt="" loading="lazy" width="460" height="306" />
          <Link className="abidjan-diorama__hotspot" to="/carte?q=Treichville" aria-label="Garba à Treichville, explorer ce quartier sur la carte" />
        </div>
      </div>
      <nav className="abidjan-diorama__quartiers" aria-label="Explorer les quartiers d’Abidjan">
        <span>Explorer par quartier</span>
        {quartiers.map(quartier => <Link key={quartier} to={`/carte?q=${encodeURIComponent(quartier)}`}>{quartier}<span aria-hidden="true">↗</span></Link>)}
      </nav>
    </section>
  );
}
