// 404 — Moka a flairé, mais cette page n'existe pas.
import { Link } from "react-router";
import { usePageTitle } from "../lib/use-page-title";

export default function NotFoundPage() {
  usePageTitle("Page introuvable");
  return (
    <section className="section notfound">
      <div className="container container--narrow">
        <p className="kicker">404</p>
        <h1>Même Moka n&rsquo;a pas flairé cette page</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Elle a déménagé, ou elle n&rsquo;a jamais existé. Retourne à la carte.
        </p>
        <Link className="btn" to="/">
          Revenir à l&rsquo;accueil
        </Link>
      </div>
    </section>
  );
}
