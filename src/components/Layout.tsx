// Enveloppe commune — en-tête réduit à la marque, pied de page légal.
//
// La vitrine n'a PAS de navigation : c'est une page unique, et un menu à
// une entrée est un menu de trop. Le seul lien de l'en-tête est le quiz,
// parce que c'est la seule chose qu'un visiteur peut faire aujourd'hui.
//
// Aucune dépendance à une session : l'ancien en-tête appelait useAuth()
// pour choisir entre « Mon compte » et « Connexion ». Il n'y a plus de
// compte, donc plus de provider, donc plus rien à charger avant le premier
// rendu.

import { Link, Outlet } from "react-router";
import { CONTACT_EMAIL, INSTAGRAM_URL, QUIZ_URL } from "../lib/config";

function Header() {
  return (
    <header className="site-header">
      <div className="container site-header__inner">
        <Link className="brand" to="/" aria-label="SPAWT — accueil">
          <img
            src="/brand/logo-horizontal-dark.webp"
            alt="SPAWT — La carte du bon goût"
            width={340}
            height={141}
          />
        </Link>
        <a className="header-link" href={QUIZ_URL} target="_blank" rel="noreferrer">
          Faire le quiz
        </a>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__cols">
          <div className="site-footer__brand">
            <img
              src="/brand/logo-horizontal-dark.webp"
              alt=""
              width={340}
              height={141}
            />
            <p>La carte du bon goût — Abidjan, Côte d&rsquo;Ivoire.</p>
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
              <li>
                <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer">
                  @spawt.ci
                </a>
              </li>
              <li>Abidjan, Côte d&rsquo;Ivoire</li>
            </ul>
          </div>
        </div>

        <p className="site-footer__legal">
          © {new Date().getFullYear()} SPAWT / UPGRADERS. Tous droits réservés.
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
