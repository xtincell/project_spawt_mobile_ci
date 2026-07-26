// Tests du tableau de bord lieux : rendu des onglets sur fixtures, seuil
// n<3 → « — » + infobulle, upsell Gold pour un compte pro (funnel jamais
// appelé), funnel affiché pour un compte gold, dégradation « stats en
// construction » quand les vues SQL ne sont pas déployées.
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import ProDashboardPage from "../ProDashboardPage";
import {
  makeFetchStub,
  jsonResponse,
  b2bAccountPro,
  b2bAccountGold,
  b2bAccountNone,
  b2bMonthlyStats,
  b2bFunnelRows,
  b2bReservations,
  b2bReviews,
  placeInfoRow,
  relationMissing404,
  type StubRoute,
} from "../../test/fetch-stub";

// Session factice : la page est derrière RequireAuth en prod, ici on mocke
// directement le hook (même approche que checkout.test.tsx). L'objet session
// est UNIQUE et stable : l'effet de la page dépend de `session`, une identité
// neuve à chaque rendu provoquerait une boucle infinie d'effets.
const signOut = vi.fn(async () => {});
const sessionFixture = { access_token: "jeton-b2b" };
vi.mock("../../providers/AuthProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../providers/AuthProvider")>();
  return {
    ...actual,
    useAuth: () => ({
      session: sessionFixture,
      loading: false,
      signOut,
    }),
  };
});

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/pro/dashboard"]}>
      <Routes>
        <Route path="/pro/dashboard" element={<ProDashboardPage />} />
        <Route path="/connexion" element={<h1>Page connexion</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Routes REST complètes d'un compte relié (le rôle vient de `compte`). */
function routesFor(compte: () => Response): StubRoute[] {
  return [
    { urlIncludes: "b2b_accounts", respond: compte },
    { urlIncludes: "b2b_place_stats_monthly", respond: b2bMonthlyStats },
    { urlIncludes: "b2b_place_funnel", respond: b2bFunnelRows },
    { urlIncludes: "reservation_requests", respond: b2bReservations },
    { urlIncludes: "spawt_checkin", respond: b2bReviews },
    { urlIncludes: "rest/v1/places", respond: placeInfoRow },
  ];
}

afterEach(() => {
  vi.unstubAllGlobals();
  signOut.mockClear();
});

describe("ProDashboardPage — compte non relié", () => {
  it("invite à écrire à l'équipe (mailto) quand aucun lieu n'est rattaché", async () => {
    const stub = makeFetchStub([{ urlIncludes: "b2b_accounts", respond: b2bAccountNone }]);
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();

    expect(await screen.findByText(/pas encore relié/i)).toBeInTheDocument();
    const mailto = screen.getByRole("link", { name: /écris-nous/i });
    expect(mailto.getAttribute("href")).toContain("mailto:");
    expect(mailto.getAttribute("href")).toContain(encodeURIComponent("Relier mon lieu sur SPAWT"));
  });
});

describe("ProDashboardPage — compte pro", () => {
  it("aperçu : nom du lieu, badge Spawt Pro, cartes du mois et rapport PDF", async () => {
    const stub = makeFetchStub(routesFor(b2bAccountPro));
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();

    expect(await screen.findByRole("heading", { name: "Chez Tantie Alice" })).toBeInTheDocument();
    expect(screen.getAllByText("Spawt Pro").length).toBeGreaterThanOrEqual(1);

    // Cartes du mois courant, valeurs des fixtures.
    const carteSpawts = screen.getByText("Spawts vérifiés ce mois").closest(".stat-card");
    expect(carteSpawts).toHaveTextContent("12");
    const carteNote = screen.getByText("Note pondérée par stade").closest(".stat-card");
    expect(carteNote).toHaveTextContent("4,2");
    // 2 demandes de réservation créées ce mois-ci dans la fixture.
    const carteResas = screen.getByText("Résas reçues ce mois").closest(".stat-card");
    expect(carteResas).toHaveTextContent("2");

    // Tableau des 6 derniers mois + bouton rapport imprimable.
    expect(screen.getByText("Le détail, mois par mois")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /télécharger le rapport \(pdf\)/i })).toBeInTheDocument();
  });

  it("seuil n<3 : les agrégats masqués s'affichent « — » avec l'infobulle", async () => {
    const stub = makeFetchStub(routesFor(b2bAccountPro));
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();
    await screen.findByRole("heading", { name: "Chez Tantie Alice" });

    // Le mois -1 de la fixture est tout NULL + les mois sans ligne : plusieurs
    // tirets, chacun portant l'explication du seuil anti-réidentification.
    const tirets = screen.getAllByTitle(/anonymat de la meute/i);
    expect(tirets.length).toBeGreaterThanOrEqual(3);
    expect(tirets[0]).toHaveTextContent("—");
  });

  it("onglet Réservations : liste triée, statuts traduits, lecture seule assumée", async () => {
    const stub = makeFetchStub(routesFor(b2bAccountPro));
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();
    await screen.findByRole("heading", { name: "Chez Tantie Alice" });

    fireEvent.click(screen.getByRole("tab", { name: "Réservations" }));
    const panneau = screen.getByRole("tabpanel");
    expect(within(panneau).getByText("4 pers.")).toBeInTheDocument();
    expect(within(panneau).getByText("Confirmée")).toBeInTheDocument();
    expect(within(panneau).getByText("Envoyée")).toBeInTheDocument();
    expect(within(panneau).getByText("Annulée")).toBeInTheDocument();
    expect(within(panneau).getAllByText("WhatsApp", { selector: "td" }).length).toBeGreaterThanOrEqual(1);
    // Décision RLS 0042/0043 : pas d'UPDATE B2B → le portail l'explique.
    expect(within(panneau).getByText(/pas modifiable depuis le portail/i)).toBeInTheDocument();
  });

  it("onglet Avis : agrégats du mois + avis publics individuels (RLS 0021)", async () => {
    const stub = makeFetchStub(routesFor(b2bAccountPro));
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();
    await screen.findByRole("heading", { name: "Chez Tantie Alice" });

    fireEvent.click(screen.getByRole("tab", { name: "Avis" }));
    const panneau = screen.getByRole("tabpanel");
    expect(within(panneau).getByText(/note pondérée/i)).toBeInTheDocument();
    expect(within(panneau).getByText(/le poisson braisé est une claque/i)).toBeInTheDocument();
    expect(within(panneau).getByText(/awa · djidji/i)).toBeInTheDocument();
    // Les avis appartiennent à la Meute : pas de réponse depuis le portail.
    expect(within(panneau).getByText(/pas de réponse ni de modération/i)).toBeInTheDocument();
  });

  it("onglet Audience : upsell Spawt Gold, mailto, et AUCUN appel au funnel", async () => {
    const stub = makeFetchStub(routesFor(b2bAccountPro));
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();
    await screen.findByRole("heading", { name: "Chez Tantie Alice" });

    fireEvent.click(screen.getByRole("tab", { name: "Audience" }));
    const panneau = screen.getByRole("tabpanel");
    expect(within(panneau).getByText(/65 000 F/)).toBeInTheDocument();
    expect(within(panneau).getByText(/archétypes/i)).toBeInTheDocument();
    const mailto = within(panneau).getByRole("link", { name: /passer gold/i });
    expect(mailto.getAttribute("href")).toContain(encodeURIComponent("Passer Spawt Gold"));

    // Le gate SQL rendrait la vue vide pour un compte pro : on ne l'appelle pas.
    expect(stub.calls.some((c) => c.url.includes("b2b_place_funnel"))).toBe(false);
  });
});

describe("ProDashboardPage — compte gold", () => {
  it("badge Spawt Gold et funnel découverte → venue dans Audience", async () => {
    const stub = makeFetchStub(routesFor(b2bAccountGold));
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();
    await screen.findByRole("heading", { name: "Chez Tantie Alice" });

    expect(screen.getAllByText("Spawt Gold").length).toBeGreaterThanOrEqual(1);
    expect(stub.calls.some((c) => c.url.includes("b2b_place_funnel"))).toBe(true);

    fireEvent.click(screen.getByRole("tab", { name: "Audience" }));
    const panneau = screen.getByRole("tabpanel");
    expect(within(panneau).getAllByText("Vues de fiche").length).toBeGreaterThanOrEqual(1);
    expect(within(panneau).getAllByText("240").length).toBeGreaterThanOrEqual(1);
    // shares du mois courant sous le seuil → tiret avec infobulle.
    expect(within(panneau).getAllByTitle(/anonymat de la meute/i).length).toBeGreaterThanOrEqual(1);
    // Pas d'upsell pour un compte déjà gold.
    expect(within(panneau).queryByText(/65 000 F/)).not.toBeInTheDocument();
  });
});

describe("ProDashboardPage — base pas encore migrée", () => {
  it("toutes les vues absentes → « stats en construction », sans casser", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "b2b_accounts", respond: b2bAccountPro },
      { urlIncludes: "b2b_place_stats_monthly", respond: relationMissing404 },
      { urlIncludes: "reservation_requests", respond: relationMissing404 },
      { urlIncludes: "spawt_checkin", respond: relationMissing404 },
      { urlIncludes: "rest/v1/places", respond: relationMissing404 },
    ]);
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();

    // Sans fiche lisible, le titre reste neutre — et l'aperçu se dégrade.
    expect(await screen.findByRole("heading", { name: "Ton tableau de bord" })).toBeInTheDocument();
    expect(screen.getByText(/stats en construction/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Réservations" }));
    expect(screen.getByText(/stats en construction/i)).toBeInTheDocument();
  });

  it("session expirée sur b2b_accounts → déconnexion + renvoi connexion", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "b2b_accounts", respond: () => jsonResponse({ message: "JWT expired" }, 401) },
    ]);
    vi.stubGlobal("fetch", stub.impl);
    renderDashboard();

    expect(await screen.findByText("Page connexion")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });
});
