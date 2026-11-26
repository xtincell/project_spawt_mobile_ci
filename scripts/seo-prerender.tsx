import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { StaticRouter } from "react-router";
import { communityPlaces } from "../src/lib/community-places";
import { downloadPath, origin, placePath, legalPages, publicPages, pageMeta, metaTags, softwareApplication } from "../src/lib/seo";
import Confidentialite from "../src/pages/legal/ConfidentialitePage";
import Cgu from "../src/pages/legal/CguPage";
import Cgv from "../src/pages/legal/CgvPage";
import Suppression from "../src/pages/legal/SuppressionComptePage";

const legal = [Confidentialite, Cgu, Cgv, Suppression];
function Links() {
  return <nav aria-label="Explorer SPAWT"><a href="/">Accueil SPAWT</a> · <a href="/carte">Explorer la carte</a> · <a href={downloadPath}>Télécharger l’APK Android</a></nav>;
}
function Places() {
  return <ul>{communityPlaces.map(place => <li key={place.slug}><a href={placePath(place.slug)}>{place.name}</a> · {place.specialty}, {place.address}</li>)}</ul>;
}
function Body({ path }: { path: string }) {
  const page = pageMeta(path);
  const place = communityPlaces.find(x => placePath(x.slug) === page.path);
  const legalIndex = legalPages.findIndex(([p]) => p === path);
  const Legal = legal[legalIndex];
  if (Legal) return <main><Links/><Legal /></main>;
  return <main className="section"><div className="container container--narrow">
    {path === "/" ? <>
      <h1>Où manger à Abidjan avec SPAWT</h1><p>{page.description}</p>
      <p><a href={downloadPath}>Télécharger SPAWT gratuitement pour Android</a></p>
      <h2>Les trouvailles de la Bande</h2><p>Un sushi à Zone 4, une pause café à Marcory ou un dessert à Prima Center. Découvre les adresses et les avis avant de choisir.</p>
      <Places/><p><a href="/carte">Explorer la carte des lieux</a></p>
      <footer>{legalPages.map(([href, label]) => <p key={href}><a href={href}>{label}</a></p>)}</footer>
    </> : place ? <>
      <h1>{place.name}</h1><p>{place.specialty} · {place.address}</p>
      <figure><img src={"/brand/editorial/" + place.meal.src} width={place.meal.width} height={place.meal.height} alt={place.meal.alt}/><figcaption>{place.meal.caption ?? place.meal.credit}</figcaption></figure>
      <h2>L’avis sur {place.name}</h2><p>{place.reviewer} · {place.score}/5</p>
      <blockquote>{place.comment}</blockquote><p>{place.sourceLabel}</p><Links/>
    </> : path === "/carte" ? <>
      <h1>La carte des adresses d’Abidjan</h1><p>{page.description}</p><Places/><Links/>
    </> : <><h1>{page.title.split(" | ")[0]}</h1><p>{page.description}</p><Links/></>}
  </div></main>;
}
export const indexed = publicPages.map(p => p.path!);
export function renderPage(path: string) {
  const page = pageMeta(path);
  const meta = metaTags(page);
  const head = renderToStaticMarkup(<>
    <title>{page.title}</title>
    {Object.entries(meta.name).map(([name, content]) => <meta data-spawt-seo="" key={name} name={name} content={content}/>)}
    {Object.entries(meta.property).map(([name, content]) => <meta data-spawt-seo="" key={name} property={name} content={content}/>)}
    {page.path && <link data-spawt-seo="" rel="canonical" href={origin + page.path}/>}
    {path === "/" && <script data-spawt-seo="" type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(softwareApplication).replace(/</g, "\\u003c")}}/>}
  </>);
  const body = renderToStaticMarkup(<StaticRouter location={path}><Body path={path}/></StaticRouter>);
  return { head, body };
}
