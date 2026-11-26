// En-tête des pages secondaires et pied de page commun de la vitrine.

import { useState, type ReactNode } from "react";
import { Link, Outlet } from "react-router";
import { CONTACT_EMAIL, PUBLIC_BRAND_URL } from "../lib/config";
import { usePublicBrand } from "../lib/public-brand";

const FALLBACK_LOGO = "/brand/logo-horizontal-dark.webp";
/** Match the public publisher's asset directory and the CSP, without remote
 * tracking/referrers. A broken edition image never removes the live identity. */
export function logoForSite(value: string | null) {
  if (!value) return FALLBACK_LOGO;
  try {
    const url = new URL(value);
    return url.origin === new URL(PUBLIC_BRAND_URL).origin && !url.username && !url.password && !url.search && !url.hash
      && /^\/brand\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_-]+\.(?:png|webp|jpe?g|svg)$/.test(url.pathname)
      ? url.href : FALLBACK_LOGO;
  } catch { return FALLBACK_LOGO; }
}
export function BrandLogo({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return <img src={failed ? FALLBACK_LOGO : url} alt={alt} width={340} height={141}
    referrerPolicy="no-referrer" onError={() => { if (!failed) setFailed(true); }} />;
}

function Header() {
  const brand = usePublicBrand();
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" to="/" aria-label={`${brand.name} — accueil`}>
          <BrandLogo key={brand.logoUrl} url={logoForSite(brand.logoUrl)} alt={`${brand.name} — ${brand.title}`} />
        </Link>
        <Link className="header-link" to="/#telecharger">Télécharger SPAWT</Link>
      </div>
    </header>
  );
}

function Footer() {
  const brand = usePublicBrand();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__cols">
          <div className="site-footer__brand">
            <BrandLogo key={brand.logoUrl} url={logoForSite(brand.logoUrl)} alt="" />
            <p>{brand.title} — Abidjan, Côte d&rsquo;Ivoire.</p>
          </div>

          <nav aria-labelledby="footer-legal">
            <h2 id="footer-legal">Légal</h2>
            <ul>
              <li>
                <Link to="/legal/confidentialite">Confidentialité</Link>
              </li>
              <li>
                <Link to="/legal/cgu">Conditions d&rsquo;utilisation</Link>
              </li>
              <li>
                <Link to="/legal/cgv">Conditions de vente</Link>
              </li>
              <li>
                <Link to="/legal/suppression-compte">Supprimer mon compte</Link>
              </li>
            </ul>
          </nav>

          <div>
            <h2 id="footer-contact">Contact</h2>
            <ul aria-labelledby="footer-contact">
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </li>
              {brand.links.map((link) => <li key={link.url}>
                <a href={link.url} target="_blank" rel="noreferrer">{link.label}</a>
              </li>)}
              <li>Abidjan, Côte d&rsquo;Ivoire</li>
              <li><Link to="/statut">Vérifier les contenus SPAWT</Link></li>
            </ul>
          </div>
        </div>

        <p className="site-footer__legal">
          © {new Date().getFullYear()} {brand.name} / UPGRADERS. Tous droits réservés.
        </p>
      </div>
    </footer>
  );
}

export default function Layout({ header, className = "" }: { header?: ReactNode; className?: string } = {}) {
  return (
    <div className={`page ${className}`}>
      {header ?? <Header />}
      <main className="page-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
