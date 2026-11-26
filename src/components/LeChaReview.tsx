import { useState } from "react";
import { Link, useParams } from "react-router";
import ApkDownload from "./ApkDownload";
import PlaceReviewCard, { PhotoCredit } from "./PlaceReviewCard";
import { communityPlaces, type CommunityPlace } from "../lib/community-places";
import "../styles/le-cha-review.css";

const media = "/brand/editorial/";
const icons = "/brand/accueil/";
const leChaRoute = "/ouvrir/avis/le-cha-alexandre";
function reviewLink(place: CommunityPlace) {
  const localReader = place.slug === "le-cha" ? leChaRoute : "/trouvailles/" + place.slug;
  const android = /Android/i.test(navigator.userAgent);
  if (!android) return localReader;
  const fallback = encodeURIComponent("https://spawt.online" + localReader + "#installer");
  const intent = place.slug === "le-cha" ? "spawt.online" + leChaRoute + "#Intent;scheme=https" : "place/" + place.id + (place.slug === "dipndip" ? "" : "/reviews") + "#Intent;scheme=spawt";
  return "intent://" + intent + ";package=com.upgraders.spawt;S.browser_fallback_url=" + fallback + ";end";
}

function PlacePanel({ place, reader }: { place: CommunityPlace; reader: boolean }) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  return <div className="lecha-layout" data-place={place.slug}>
    <figure className="lecha-experience">
      <img className="lecha-photo" src={media + place.meal.src} width={place.meal.width} height={place.meal.height}
        srcSet={place.slug === "le-cha" ? media + "lecha-table-480.webp 480w, " + media + place.meal.src + " 960w" : undefined}
        sizes="(max-width: 760px) 100vw, (max-width: 1250px) 52vw, 620px"
        loading={reader ? "eager" : "lazy"} decoding="async" alt={place.meal.alt} />
      <figcaption><span>{place.meal.caption ?? ("À table chez " + place.name)}</span> <PhotoCredit photo={place.meal} />
        {place.meal.venueSource && <a className="lecha-local-dessert" href={place.meal.venueSource} target="_blank" rel="noreferrer">Voir les crêpes de DipnDip à Abidjan</a>}
      </figcaption>
    </figure>
    <div className="lecha-card-wrap"><PlaceReviewCard place={place} reader={reader} appHref={reviewLink(place)} showApp={!reader || isAndroid} />
      {reader && <div id="installer" className="lecha-install"><ApkDownload className="accueil-lien" /></div>}
    </div>
    {reader && <Link className="accueil-lien lecha-map-link" to={"/carte?lieu=" + place.id}>
      Voir la fiche sur la carte <img className="accueil-nav-icon" src={icons + "suivant.png"} alt="" />
    </Link>}
  </div>;
}

export function LeChaReview({ reader = false }: { reader?: boolean }) {
  const { slug } = useParams();
  const [selected, setSelected] = useState(0);
  const recognized = communityPlaces.find(p => p.slug === slug);
  const current = reader ? (recognized ?? communityPlaces[0]) : communityPlaces[selected];
  const Heading = reader ? "h1" : "h2";
  if (reader && slug && !recognized) return <section className="lecha"><h1>Adresse introuvable</h1><Link to="/#le-cha">Retrouver les trouvailles</Link></section>;
  return <section id="le-cha" className="lecha" aria-labelledby="lecha-heading">
    <div className="lecha-section-head">
      <Heading id="lecha-heading">{reader ? "L’avis sur " + current.name : "Les trouvailles de la Bande"}<b>.</b></Heading>
      {!reader && <div className="lecha-choices" role="group" aria-label="Choisir une adresse">
        {communityPlaces.map((place, index) => <button key={place.id} type="button" aria-pressed={index === selected} onClick={() => setSelected(index)}><img width="36" height="36" src={media + place.front.src} alt="" loading="lazy" /><span>{place.name}</span></button>)}
      </div>}
    </div>
    <PlacePanel key={current.id} place={current} reader={reader} />
  </section>;
}
