// Layout commun : en-tête sticky (wordmark + nav) / contenu / pied de page
// légal. Rendu autour de toutes les routes via <Outlet /> (react-router).

import { Outlet, NavLink, Link } from "react-router";
import { CONTACT_EMAIL, QUIZ_URL } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";

function Header() {
  const { session } = useAuth();
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link to="/" className="wordmark" aria-label="SPAWT — accueil">
          SPAWT
        </Link>
        <nav className="site-nav" aria-label="Navigation principale">
          <NavLink to="/gold">Gold</NavLink>
          <NavLink to="/pro">Espace lieux</NavLink>
          {session ? (
            <NavLink to="/compte">Mon compte</NavLink>
          ) : (
            <NavLink to="/connexion">Connexion</NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__cols">
          <div>
            <h4>SPAWT</h4>
            <ul>
              <li>La carte du bon goût — Abidjan.</li>
              <li>
                <a href={QUIZ_URL} target="_blank" rel="noreferrer">
                  Découvre ton archétype
                </a>
              </li>
              <li>
                <Link to="/gold">Spawter Gold</Link>
              </li>
              <li>
                <Link to="/pro">Ton lieu sur SPAWT</Link>
              </li>
              <li>
                <Link to="/ambassadeurs">Deviens ambassadeur</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Légal</h4>
            <ul>
              <li>
                <Link to="/legal/confidentialite">Confidentialité</Link>
              </li>
              <li>
                <Link to="/legal/cgu">Conditions d'utilisation</Link>
              </li>
              <li>
                <Link to="/legal/cgv">Conditions de vente</Link>
              </li>
              <li>
                <Link to="/legal/suppression-compte">Supprimer mon compte</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
              </li>
              <li>Abidjan, Côte d'Ivoire</li>
            </ul>
          </div>
        </div>
        <p className="site-footer__legal">
          © {year} SPAWT / UPGRADERS. Tous droits réservés. Prix B2C affichés
          TTC (TVA 18 % incluse), prix B2B affichés HT.
        </p>
      </div>
    </footer>
  );
}

export default function Layout() {
  return (
    <div className="page">
      <Header />
      <main className="page-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
