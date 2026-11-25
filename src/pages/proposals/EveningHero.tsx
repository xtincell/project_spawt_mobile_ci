import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router";
import "../../styles/evening-hero.css";

const art = "/brand/accueil/";
const spots = [
  {
    id: "marcory",
    name: "Villa le Prisé",
    place: "5fc3912f-d79a-5b6c-b263-2bfbaf2d820e",
    area: "Marcory",
    occasion: "Dîner entre amis",
    title: "Ce soir, on mange où ?",
    lines: ["Ce soir,", "on mange où ?"],
    alt: "Scène de maquis illustrée, une cuisinière prépare des brochettes à la tombée du jour.",
  },
  {
    id: "yopougon",
    name: "Azito Palmeraie",
    place: "846cbab9-1ecf-5ba4-9927-99efa5e5c5ba",
    area: "Yopougon",
    occasion: "Déjeuner au maquis",
    title: "Une envie de braisé ?",
    lines: ["Une envie", "de braisé ?"],
    alt: "Scène culinaire illustrée, un poulet braisé servi avec des oignons et un verre de bissap.",
  },
  {
    id: "in-concept",
    name: "IN’ Concept Store",
    place: "c5acfd12-01dd-5cd3-9beb-0531d89c3e99",
    area: "Bd des Martyrs",
    occasion: "Brunch",
    title: "Envie d’un brunch ?",
    lines: ["Envie d’un", "brunch ?"],
    alt: "Illustration du brunch, des pancakes à la banane et au miel sur une terrasse.",
  },
] as const;
export type HeroSpot = (typeof spots)[number]["id"];

function Relief({ stage }: { stage: React.RefObject<HTMLDivElement> }) {
  const surface = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const viewport = stage.current,
      canvas = surface.current;
    if (
      !viewport ||
      !canvas ||
      !window.matchMedia ||
      !window.WebGL2RenderingContext ||
      !window.ResizeObserver
    )
      return;
    const desktopRelief = window.matchMedia(
      "(min-width: 721px) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let finish: (() => void) | undefined;
    let disposed = false;
    let revision = 0;
    function update() {
      const generation = ++revision;
      finish?.();
      finish = undefined;
      if (!desktopRelief.matches || document.hidden || !viewport || !canvas)
        return;
      let context: WebGL2RenderingContext | null;
      try {
        context = canvas.getContext("webgl2", {
          alpha: true,
          antialias: true,
          powerPreference: "low-power",
        });
      } catch {
        return;
      }
      if (!context || context.isContextLost()) return;
      void import("./paper-atlas")
        .then(({ mountPaperAtlas }) => {
          if (!disposed && generation === revision)
            finish = mountPaperAtlas(viewport, canvas, context);
        })
        .catch(() => {
          if (generation === revision) delete viewport.dataset.relief;
        });
    }
    update();
    desktopRelief.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      disposed = true;
      finish?.();
      desktopRelief.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [stage]);
  return (
    <>
      <img
        className="eh-terrain"
        src={art + "maquette-lagune.webp"}
        width="1300"
        height="491"
        alt=""
      />
      <canvas className="eh-relief" ref={surface} aria-hidden="true" />
    </>
  );
}

export default function EveningHero({
  download,
  initialSpot = "marcory",
}: {
  download: ReactNode;
  initialSpot?: HeroSpot;
}) {
  const [active, setActive] = useState<HeroSpot>(initialSpot);
  const current = spots.find((s) => s.id === active) || spots[0];
  const stage = useRef<HTMLDivElement>(null);
  return (
    <section
      className="eh-hero"
      data-active-spawt={current.id}
      aria-label="Les spawts d’Abidjan"
    >
      <div className="eh-backdrop">
        <picture key={current.id}>
          <source
            media="(max-width: 720px)"
            srcSet={art + "scene-" + current.id + "-mobile.webp"}
          />
          <img
            src={art + "scene-" + current.id + ".webp"}
            alt={current.alt}
            width="1536"
            height="864"
            loading="eager"
          />
        </picture>
      </div>
      <div className="eh-main">
        <div className="eh-caption" aria-live="polite" aria-atomic="true">
          <h1 aria-label={current.title}>
            {current.lines.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </h1>
        </div>
        <p className="eh-promise">
          Les trouvailles de la Bande, autour de toi.
        </p>
        <div className="eh-primary-action">{download}</div>
      </div>
      <div
        className="eh-atlas"
        ref={stage}
        role="group"
        aria-label="Choisir un spawt sur la carte d’Abidjan"
      >
        <Relief stage={stage} />
        {spots.map((spot) => (
          <div
            className="eh-marker"
            key={spot.id}
            data-spot={spot.id}
            data-current={spot.id === active}
          >
            <button
              className="eh-pin"
              type="button"
              aria-label={"Afficher " + spot.name}
              aria-pressed={spot.id === active}
              onClick={() => setActive(spot.id)}
            >
              <img
                src={art + "repere-spawt.webp"}
                alt=""
                width="45"
                height="68"
              />
            </button>
            {spot.id === active && (
              <Link
                className="eh-spot-card"
                to={"/carte?lieu=" + spot.place}
                aria-label={"Voir la fiche de " + spot.name}
              >
                <img
                  className="eh-card-photo"
                  src={art + "fiche-" + spot.id + ".webp"}
                  width="156"
                  height="136"
                  alt=""
                />
                <span className="eh-card-text">
                  <small>{spot.area}</small>
                  <strong>{spot.name}</strong>
                  <span>{spot.occasion}</span>
                </span>
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
