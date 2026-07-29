// 404 — le Chat a flairé, mais cette page n'existe pas.
import { Link } from "react-router";
import { usePageTitle } from "../lib/use-page-title";

export default function NotFoundPage() {
  usePageTitle("Page introuvable");
  return (
    <section className="section">
      <div className="container container--narrow" style={{ textAlign: "center" }}>
        <p className="section-kicker">404</p>
        <h1>Même le Chat n'a pas flairé cette page</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Elle a déménagé, ou elle n'a jamais existé. Retourne à la carte.
        </p>
        <Link className="btn btn--night" to="/">
          Revenir à l'accueil
        </Link>
      </div>
    </section>
  );
}
