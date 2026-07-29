// Rendu des pages clés : landing (héro, piliers, Guet), gold (prix TTC, FAQ),
// pages légales (marqueurs juriste) et états de la page retour.
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { ReactElement } from "react";
import LandingPage from "../LandingPage";
import GoldPage from "../GoldPage";
import RetourPage from "../RetourPage";
import ConfidentialitePage from "../legal/ConfidentialitePage";
import CguPage from "../legal/CguPage";
import CgvPage from "../legal/CgvPage";
import SuppressionComptePage from "../legal/SuppressionComptePage";

function renderAt(ui: ReactElement, path = "/") {
  return render(<MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>);
}

describe("LandingPage", () => {
  it("affiche le héro, les 3 piliers et Le Guet", () => {
    renderAt(<LandingPage />);
    expect(screen.getByRole("heading", { name: /la carte du bon goût/i })).toBeInTheDocument();
    expect(screen.getByText(/ne plus jamais regretter un lieu/i)).toBeInTheDocument();
    expect(screen.getByText(/trois taps/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^instinct$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^identité$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^communauté$/i })).toBeInTheDocument();
    expect(screen.getByText(/des spawts vérifiés/i)).toBeInTheDocument();
  });

  it("affiche les badges stores en « bientôt » sans URL configurée", () => {
    renderAt(<LandingPage />);
    expect(screen.getAllByText(/bientôt sur/i)).toHaveLength(2);
    expect(screen.getByText("App Store")).toBeInTheDocument();
    expect(screen.getByText("Google Play")).toBeInTheDocument();
  });

  it("pointe vers le quiz archétype", () => {
    renderAt(<LandingPage />);
    const lien = screen.getByRole("link", { name: /découvre ton archétype/i });
    expect(lien).toHaveAttribute("href", "https://quiz.spawt.online");
  });

  it("présente le programme ambassadeur et pointe vers /ambassadeurs", () => {
    renderAt(<LandingPage />);
    expect(
      screen.getByRole("heading", { name: /deviens la voix de la meute/i }),
    ).toBeInTheDocument();
    const lien = screen.getByRole("link", { name: /découvrir les 3 paliers/i });
    expect(lien).toHaveAttribute("href", "/ambassadeurs");
  });
});

describe("GoldPage", () => {
  it("affiche les prix TTC en évidence et la mention HT discrète", () => {
    renderAt(<GoldPage />, "/gold");
    expect(screen.getByText(/2 950 F CFA/)).toBeInTheDocument();
    expect(screen.getByText(/29 500 F CFA/)).toBeInTheDocument();
    expect(screen.getAllByText(/TVA 18 %/).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/2 mois offerts/i)).toBeInTheDocument();
  });

  it("répond aux deux questions clés de la FAQ", () => {
    renderAt(<GoldPage />, "/gold");
    expect(
      screen.getByText(/pourquoi payer ici et pas dans l'app/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/le mobile money ne prélève pas tout seul/i)).toBeInTheDocument();
    expect(screen.getByText(/7 jours de grâce/i)).toBeInTheDocument();
  });

  it("le CTA renvoie vers la connexion quand personne n'est connecté", () => {
    renderAt(<GoldPage />, "/gold");
    const cta = screen.getByRole("link", { name: /^passer gold$/i });
    expect(cta).toHaveAttribute("href", "/connexion?next=%2Fgold%2Fpaiement");
  });
});

describe("RetourPage", () => {
  it("sans transaction_id : état « référence manquante »", async () => {
    renderAt(<RetourPage />, "/gold/retour");
    expect(await screen.findByText(/il manque un morceau/i)).toBeInTheDocument();
  });

  it("avec transaction_id mais session absente : propose la reconnexion", async () => {
    renderAt(<RetourPage />, "/gold/retour?transaction_id=txn-42");
    const lien = await screen.findByRole("link", { name: /me reconnecter/i });
    expect(lien.getAttribute("href")).toContain("transaction_id%3Dtxn-42");
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
