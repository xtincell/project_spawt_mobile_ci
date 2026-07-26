// Tests du retour de paiement lieux (/pro/retour) : poll de la vue
// active_entitlements avec le prédicat B2B (hasActiveB2b), succès → CTA
// tableau de bord ; transaction_id absent → message dédié. Le timeout (2 min
// réelles) et la mécanique fine du poll sont couverts par les tests unitaires
// de lib/entitlement.
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import ProRetourPage from "../ProRetourPage";
import {
  makeFetchStub,
  b2bEntitlementsActivePro,
  entitlementsActive,
} from "../../test/fetch-stub";

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

function renderRetour(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/pro/retour" element={<ProRetourPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ProRetourPage", () => {
  it("succès : ligne pro/b2b_gold active → confirmation + lien tableau de bord", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: b2bEntitlementsActivePro },
    ]);
    vi.stubGlobal("fetch", stub.impl);
    renderRetour("/pro/retour?transaction_id=SPAWT-TX-test-b2b");

    expect(
      await screen.findByText(/l'abonnement de ton lieu est actif/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voir mon tableau de bord/i })).toHaveAttribute(
      "href",
      "/pro/dashboard",
    );
    // Le poll interroge la vue RLS (le tri B2C/B2B se fait par prédicat).
    expect(stub.calls[0].url).toContain("active_entitlements");
  });

  it("une ligne Gold SPAWTER (B2C) ne valide PAS un paiement lieu (prédicat B2B)", async () => {
    // entitlementsActive = fixture B2C sans plan b2b → le poll continue
    // d'attendre : la page reste sur l'état « on confirme ».
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: entitlementsActive },
    ]);
    vi.stubGlobal("fetch", stub.impl);
    renderRetour("/pro/retour?transaction_id=SPAWT-TX-test-b2b");

    expect(await screen.findByText(/on confirme ton paiement/i)).toBeInTheDocument();
    expect(screen.queryByText(/l'abonnement de ton lieu est actif/i)).not.toBeInTheDocument();
  });

  it("transaction_id absent : message « il manque un morceau » + lien espace lieux", () => {
    const stub = makeFetchStub([]);
    vi.stubGlobal("fetch", stub.impl);
    renderRetour("/pro/retour");

    expect(screen.getByText(/il manque un morceau/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /vérifier mon espace lieux/i })).toHaveAttribute(
      "href",
      "/pro/dashboard",
    );
  });
});
