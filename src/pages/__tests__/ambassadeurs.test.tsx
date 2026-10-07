// Tests de la page /ambassadeurs : les 3 paliers toujours visibles, et le
// bloc « Ton palier » dans ses quatre parcours — non connecté (invitation à
// se connecter, AUCUN appel réseau), connecté avec palier (badge + date),
// connecté sans palier (attribution par l'équipe + CTA candidature mailto),
// table pas encore migrée (42P01 → même parcours, sans casser).
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import AmbassadeursPage from "../AmbassadeursPage";
import {
  makeFetchStub,
  ambassadorRow,
  ambassadorNone,
  relationMissing42P01,
} from "../../test/fetch-stub";

// Session pilotable par test : vi.hoisted rend la référence visible depuis la
// factory vi.mock (hoistée), et useAuth la lit au moment du rendu.
const auth = vi.hoisted(() => ({
  session: null as { access_token: string } | null,
}));
vi.mock("../../providers/AuthProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../providers/AuthProvider")>();
  return {
    ...actual,
    useAuth: () => ({ session: auth.session, loading: false, signOut: vi.fn(async () => {}) }),
  };
});

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/ambassadeurs"]}>
      <AmbassadeursPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  auth.session = null;
});

describe("AmbassadeursPage — les 3 paliers (toujours visibles)", () => {
  it("affiche les cartes Allié Content / Ambassadeur Actif / Guide Ambassadeur", () => {
    const stub = makeFetchStub([]);
    vi.stubGlobal("fetch", stub.impl);
    renderPage();

    expect(
      screen.getByRole("heading", { name: /deviens la voix de la meute/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Allié Content" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Ambassadeur Actif" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Guide Ambassadeur" })).toBeInTheDocument();

    // Les fourchettes de rétribution des paliers 2 et 3.
    expect(screen.getByText(/50 000 à 100 000 F/)).toBeInTheDocument();
    expect(screen.getByText(/150 000 à 250 000 F/)).toBeInTheDocument();
    // Palier 1 : Gold offert + visibilité éditoriale.
    expect(screen.getByText("Gold offert")).toBeInTheDocument();
    expect(screen.getByText(/visibilité éditoriale/i)).toBeInTheDocument();
    // Les seuils de communauté des trois paliers.
    expect(screen.getByText(/2 000\+ followers/)).toBeInTheDocument();
    expect(screen.getByText(/5 000\+ followers/)).toBeInTheDocument();
    expect(screen.getByText(/10 000\+ followers/)).toBeInTheDocument();
    // Les stades exigés (paliers 2 et 3).
    expect(screen.getByText(/stade détective/i)).toBeInTheDocument();
    expect(screen.getByText(/stade djidji/i)).toBeInTheDocument();
  });
});

describe("AmbassadeursPage — non connecté", () => {
  it("invite à se connecter pour voir son palier, sans AUCUN appel réseau", () => {
    const stub = makeFetchStub([]); // tout appel non stubbé ferait échouer le test
    vi.stubGlobal("fetch", stub.impl);
    renderPage();

    expect(screen.getByText(/connecte-toi avec ton numéro/i)).toBeInTheDocument();
    const lien = screen.getByRole("link", { name: /^me connecter$/i });
    expect(lien).toHaveAttribute("href", "/connexion?next=%2Fambassadeurs");
    expect(stub.calls).toHaveLength(0);
  });
});

describe("AmbassadeursPage — connecté", () => {
  it("avec palier : badge « Palier 2 · Ambassadeur Actif » + date d'entrée", async () => {
    auth.session = { access_token: "jeton-ambassadeur" };
    const stub = makeFetchStub([{ urlIncludes: "ambassadors", respond: () => ambassadorRow(2) }]);
    vi.stubGlobal("fetch", stub.impl);
    renderPage();

    expect(await screen.findByText(/palier 2 · ambassadeur actif/i)).toBeInTheDocument();
    expect(screen.getByText(/depuis le 15 juin 2026/i)).toBeInTheDocument();
    // La requête est bien celle de la table 0044 (RLS own).
    expect(stub.calls[0].url).toContain("/rest/v1/ambassadors?select=palier,since&limit=1");
    // Pas de CTA candidature dans « Ton palier » quand le palier est attribué.
    expect(screen.getAllByRole("link", { name: /candidater par email/i })).toHaveLength(1);
  });

  it("sans palier : « attribué par l'équipe » + CTA candidature mailto", async () => {
    auth.session = { access_token: "jeton-ambassadeur" };
    const stub = makeFetchStub([{ urlIncludes: "ambassadors", respond: ambassadorNone }]);
    vi.stubGlobal("fetch", stub.impl);
    renderPage();

    expect(await screen.findByText(/attribué par l'équipe/i)).toBeInTheDocument();
    // Deux CTA : le bloc « Ton palier » + la section candidature du bas.
    const ctas = screen.getAllByRole("link", { name: /candidater par email/i });
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    expect(ctas[0].getAttribute("href")).toContain("mailto:spawt.ci@gmail.com");
    expect(ctas[0].getAttribute("href")).toContain(
      encodeURIComponent("Candidature Ambassadeur SPAWT"),
    );
  });

  it("table pas encore migrée (42P01) : même parcours candidature, sans casser", async () => {
    auth.session = { access_token: "jeton-ambassadeur" };
    const stub = makeFetchStub([{ urlIncludes: "ambassadors", respond: relationMissing42P01 }]);
    vi.stubGlobal("fetch", stub.impl);
    renderPage();

    expect(await screen.findByText(/attribué par l'équipe/i)).toBeInTheDocument();
    expect(
      screen.getAllByRole("link", { name: /candidater par email/i }).length,
    ).toBeGreaterThanOrEqual(2);
  });
});
