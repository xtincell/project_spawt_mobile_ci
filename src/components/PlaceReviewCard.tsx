import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { CommunityPlace } from "../lib/community-places";

const media = "/brand/editorial/";
const icons = "/brand/accueil/";
const portraits: Record<string, readonly string[]> = {
  "le-cha": ["salut", "curieux", "ambiance"], kaiten: ["vadrouille", "cherche", "menu"], dipndip: ["regale", "coupdecoeur", "recommande"],
};
const mokaNames: Record<string, string> = {
  curieux: "Moka curieux", ambiance: "Moka ambiance", cherche: "Moka cherche", menu: "Moka au menu",
  coupdecoeur: "Moka coup de cœur", recommande: "Moka recommande",
};

function Avatar({ variant }: { variant: string }) {
  return <span className="lecha-avatar"><img src={icons + "avatar-moka-" + variant + ".webp"} alt="" width={42} height={42} /></span>;
}

function Member({ place }: { place: CommunityPlace }) {
  return <div className="lecha-author"><Avatar variant={portraits[place.slug][0]} />
    <span><strong>{place.reviewer}</strong><small>{place.title}</small></span>
    <span className="lecha-score" aria-label={`Note : ${place.score} sur 5`}>{place.score}<small>/5</small></span>
  </div>;
}

export function PhotoCredit({ photo }: { photo: CommunityPlace["meal"] }) {
  return photo.source ? <a href={photo.source} target="_blank" rel="noreferrer">{photo.credit}</a> : <span>{photo.credit}</span>;
}

export default function PlaceReviewCard({ place, reader, appHref, showApp }: {
  place: CommunityPlace; reader: boolean; appHref: string; showApp: boolean;
}) {
  const [back, setBack] = useState(reader);
  const front = useRef<HTMLDivElement>(null);
  const reverse = useRef<HTMLDivElement>(null);
  const turnButton = useRef<HTMLButtonElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const ignoreClickUntil = useRef(0);
  useEffect(() => {
    if (front.current) front.current.inert = back;
    if (reverse.current) reverse.current.inert = !back;
  }, [back]);
  const turn = () => setBack(previous => !previous);
  function flipSurface(event: MouseEvent) {
    if (Date.now() < ignoreClickUntil.current || (event.target as HTMLElement).closest("a,button") || window.getSelection()?.toString()) return;
    turn();
    turnButton.current?.focus({ preventScroll: true });
  }
  return <article className="lecha-card" aria-label={"Carte de " + place.name} data-side={back ? "verso" : "recto"}>
    <div className="lecha-flip" onClick={flipSurface}
      onPointerDown={event => { swipe.current = { x: event.clientX, y: event.clientY }; }}
      onPointerCancel={() => { swipe.current = null; }}
      onPointerUp={event => {
        const start = swipe.current; swipe.current = null;
        if (!start || (event.target as HTMLElement).closest("a,button")) return;
        const dx = Math.abs(event.clientX - start.x);
        if (dx > 65 && dx > 1.5 * Math.abs(event.clientY - start.y)) {
          ignoreClickUntil.current = Date.now() + 420; turn();
        }
      }}>
      <div className="lecha-rotor">
        <div className="lecha-plane lecha-recto" ref={front} aria-hidden={back}>
          <div className="lecha-card__head">
            {place.setting ? <div className="lecha-venue-art"><img className="lecha-location" src={media + place.setting.src} alt={place.setting.alt} /><img className="lecha-logo-stamp" src={media + place.front.src} alt={place.front.alt} /></div>
              : <img className="lecha-front" src={media + place.front.src} alt={place.front.alt} />}
            <div><span className="lecha-specialty">{place.specialty}</span><h3>{place.name}</h3><span className="lecha-city">{place.address}</span></div>
          </div>
          <div className="lecha-social"><Member place={place} />
            <ul className="lecha-highlights">{place.highlights.map(tag => <li key={tag.icon}>
              <img src={icons + tag.icon + ".png"} alt="" />{tag.label}</li>)}</ul>
          </div>
        </div>
        <div id={place.slug + "-commentaire"} className="lecha-plane lecha-verso lecha-discussion" ref={reverse} aria-hidden={!back}>
          <header><span className="lecha-city">{place.name}</span><h3>Le commentaire</h3></header>
          <Member place={place} />
          {place.sourceUrl ? <p className="lecha-quote">{place.comment}</p> : <blockquote>« {place.comment} »</blockquote>}
          {place.ratings && <dl className="lecha-ratings">{place.ratings.map(({ label, value }) =>
            <div key={label}><dt>{label}</dt><dd>{value}<span>/5</span></dd></div>)}</dl>}
          <small className="lecha-source">{place.sourceUrl ? <a href={place.sourceUrl} target="_blank" rel="noreferrer">{place.sourceLabel}</a> : place.sourceLabel}</small>
          <div className="lecha-reactions"><h4>Les réactions de Moka</h4>
            <ul>{place.reactions.map((reaction, i) => {
              const variant = portraits[place.slug][i + 1];
              return <li key={reaction}><Avatar variant={variant} /><div><strong>{mokaNames[variant]}</strong><span>{reaction}</span></div></li>;
            })}</ul>
          </div>
          <p className="lecha-media-credit">Visuel du lieu · <PhotoCredit photo={place.front} />{place.setting && <> · <PhotoCredit photo={place.setting} /></>}</p>
        </div>
      </div>
    </div>
    <div className="lecha-actions">
      <button type="button" ref={turnButton} className="lecha-turn" onClick={turn} aria-expanded={back} aria-controls={place.slug + "-commentaire"}
        aria-label={back ? "Revoir le lieu " + place.name : "Lire le commentaire et les réactions sur " + place.name}>
        <img src={icons + (back ? "retour" : "commenter") + ".png"} alt="" />{back ? "Revoir le lieu" : "Commentaire et réactions"}
      </button>
      {showApp && <a className="lecha-open" href={appHref}>
        {place.slug === "le-cha" ? (reader ? "Ouvrir dans SPAWT" : "Lire l’avis dans SPAWT") : (place.slug === "dipndip" ? "Ouvrir le lieu dans SPAWT" : "Voir les avis dans SPAWT")}
        <img src={icons + "suivant.png"} alt="" width={16} height={16} />
      </a>}
    </div>
  </article>;
}
