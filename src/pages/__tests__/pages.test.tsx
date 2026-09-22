// Rendu des pages de la vitrine : la landing one-page et les 4 pages légales.
//
// Les tests de la landing font deux choses distinctes :
//  1. vérifier que le contenu SOURCÉ est bien là (héro, piliers §0.4,
//     modes §8, badges stores) ;
//  2. servir de verrou de non-régression sur ce qui a été RETIRÉ. Un
//     `expect(...).not.toBeInTheDocument()` paraît bizarre jusqu'au jour où
//     quelqu'un recolle un bouton « Passer Gold » sur une vitrine censée ne
//     rien vendre, ou réintroduit « Le Guet » — une fonctionnalité qui n'a
//     jamais existé ailleurs que sur l'ancienne page.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactElement } from "react";
import LandingPage from "../LandingPage";
import NotFoundPage from "../NotFoundPage";
import ConfidentialitePage from "../legal/ConfidentialitePage";
import CguPage from "../legal/CguPage";
import CgvPage from "../legal/CgvPage";
import SuppressionComptePage from "../legal/SuppressionComptePage";

function renderAt(ui: ReactElement, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

describe("LandingPage — contenu", () => {
  it("affiche le héro et la promesse maître", () => {
    renderAt(<LandingPage />);
    expect(
      screen.getByRole("heading", { level: 1, name: /la carte du bon goût/i }),
    ).toBeInTheDocument();
    // §13.2 — la promesse maître, mot à mot.
    expect(screen.getByText(/plus jamais le goumin d’un mauvais restau/i)).toBeInTheDocument();
  });

  it("affiche les 3 piliers (§0.4)", () => {
    renderAt(<LandingPage />);
    expect(screen.getByRole("heading", { name: /^instinct$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^identité$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^communauté$/i })).toBeInTheDocument();
  });

  it("affiche les 3 modes contextuels avec leurs cibles (§8)", () => {
    renderAt(<LandingPage />);
    expect(screen.getByRole("heading", { name: /^rapide$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^crew$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^explore$/i })).toBeInTheDocument();
    expect(screen.getByText(/décision en 3 taps/i)).toBeInTheDocument();
    expect(screen.getByText(/décision de groupe en 5 min/i)).toBeInTheDocument();
  });

  it("reprend les chiffres du problème tels quels (§0.1)", () => {
    renderAt(<LandingPage />);
    expect(screen.getByText("15 000+")).toBeInTheDocument();
    expect(screen.getByText("847")).toBeInTheDocument();
    expect(screen.getByText("47")).toBeInTheDocument();
  });

  it("nomme la mascotte", () => {
    renderAt(<LandingPage />);
    expect(screen.getAllByText(/moka/i).length).toBeGreaterThanOrEqual(1);
  });

  it("affiche les badges stores en « Bientôt sur », non cliquables", () => {
    renderAt(<LandingPage />);
    // Deux jeux de badges : le héro et le rappel de bas de page.
    expect(screen.getAllByText(/bientôt sur/i)).toHaveLength(4);
    expect(screen.getAllByText("App Store")).toHaveLength(2);
    expect(screen.getAllByText("Google Play")).toHaveLength(2);
    // Sans URL configurée, aucun badge n'est un lien.
    expect(screen.queryByRole("link", { name: /app store/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /google play/i })).not.toBeInTheDocument();
  });

  it("pointe vers le quiz du Palais", () => {
    renderAt(<LandingPage />);
    const liens = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "https://quiz.spawt.online");
    expect(liens.length).toBeGreaterThanOrEqual(1);
    liens.forEach((a) => expect(a).toHaveAttribute("rel", "noreferrer"));
  });
});

describe("LandingPage — verrous de non-régression", () => {
  it("ne vend rien et ne demande aucune connexion", () => {
    const { container } = renderAt(<LandingPage />);
    const internes = Array.from(container.querySelectorAll("a[href^='/']")).map((a) =>
      a.getAttribute("href"),
    );
    const interdits = ["/gold", "/connexion", "/compte", "/pro", "/ambassadeurs"];
    interdits.forEach((route) => {
      expect(internes.some((h) => h?.startsWith(route))).toBe(false);
    });
  });

  it("ne réintroduit pas « Le Guet » (fonctionnalité inventée, hors Bible)", () => {
    renderAt(<LandingPage />);
    expect(screen.queryByText(/le guet/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/spawts vérifiés/i)).not.toBeInTheDocument();
  });

  it("n'affiche aucun prix", () => {
    const { container } = renderAt(<LandingPage />);
    expect(container.textContent).not.toMatch(/FCFA|F CFA|€/);
  });
});

describe("NotFoundPage", () => {
  it("renvoie vers l'accueil", () => {
    renderAt(<NotFoundPage />, "/nawak");
    expect(screen.getByRole("link", { name: /revenir à l’accueil/i })).toHaveAttribute(
      "href",
      "/",
    );
  });
});

describe("Pages légales", () => {
  it("confidentialité : loi 2013-450, ARTCI et marqueurs juriste", () => {
    renderAt(<ConfidentialitePage />, "/legal/confidentialite");
    expect(screen.getAllByText(/2013-450/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ARTCI/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/À VALIDER PAR JURISTE/).length).toBeGreaterThanOrEqual(3);
  });

  it("CGU : éditeur et droit applicable", () => {
    renderAt(<CguPage />, "/legal/cgu");
    expect(screen.getAllByText(/UPGRADERS/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/droit ivoirien/i).length).toBeGreaterThanOrEqual(1);
  });

  it("CGV : TVA 18 %, rétractation 7 jours, pas de prélèvement automatique", () => {
    renderAt(<CgvPage />, "/legal/cgv");
    expect(screen.getAllByText(/TVA 18 %/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/7 jours/, { selector: "strong" }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/pas de prélèvement automatique/i)).toBeInTheDocument();
  });

  it("suppression de compte : accessible publiquement, email et délai 30 jours", () => {
    renderAt(<SuppressionComptePage />, "/legal/suppression-compte");
    expect(screen.getByRole("heading", { name: /supprimer ton compte/i })).toBeInTheDocument();
    expect(screen.getByText(/30 jours/, { selector: "strong" })).toBeInTheDocument();
    const mailto = screen.getByRole("link", { name: /demander la suppression par email/i });
    expect(mailto.getAttribute("href")).toContain("mailto:spawt.ci@gmail.com");
    expect(mailto.getAttribute("href")).toContain(
      encodeURIComponent("Suppression de compte SPAWT"),
    );
  });
});
