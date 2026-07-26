// Tests du retour de paiement Gold (/gold/retour) : poll de la vue
// active_entitlements avec le prédicat STRICT (hasFreshlyActivatedGold),
// succès → « Bienvenue chez les Gold » + lien /compte ; transaction_id absent
// → message dédié. Point clé : une souscription encore EN GRÂCE (renouvellement
// pendant la fenêtre de grâce) ne doit PAS déclarer le succès tant que le
// nouveau paiement n'a pas réellement activé la ligne. Le timeout (2 min
// réelles) et la mécanique fine du poll sont couverts par lib/entitlement.
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import RetourPage from "../RetourPage";
import {
  makeFetchStub,
  entitlementsActive,
  entitlementsGraceGold,
} from "../../test/fetch-stub";

const signOut = vi.fn(async () => {});
const sessionFixture = { access_token: "jeton-spawter" };
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
        <Route path="/gold/retour" element={<RetourPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RetourPage", () => {
  it("succès : ligne Gold active → « Bienvenue chez les Gold » + lien /compte", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: entitlementsActive },
    ]);
    vi.stubGlobal("fetch", stub.impl);
    renderRetour("/gold/retour?transaction_id=SPAWT-TX-test-b2c");

    expect(await screen.findByText(/bienvenue chez les gold/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voir mon abonnement/i })).toHaveAttribute(
      "href",
      "/compte",
    );
    expect(stub.calls[0].url).toContain("active_entitlements");
  });

  it("renouvellement pendant la grâce, paiement échoué : une ligne GRÂCE ne déclare pas succès", async () => {
    // Le spawter renouvelle pendant sa fenêtre de grâce ; le nouveau paiement
    // échoue → la vue ne remonte que l'ancienne ligne `status='grace'`. Avant
    // ce correctif, le 1er tick affichait « Bienvenue chez les Gold ». Le
    // prédicat strict la refuse : la page reste sur « on confirme ».
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: entitlementsGraceGold },
    ]);
    vi.stubGlobal("fetch", stub.impl);
    renderRetour("/gold/retour?transaction_id=SPAWT-TX-echec");

    expect(await screen.findByText(/on confirme ton paiement/i)).toBeInTheDocument();
    expect(screen.queryByText(/bienvenue chez les gold/i)).not.toBeInTheDocument();
  });

  it("transaction_id absent : message « il manque un morceau » + lien /compte", () => {
    const stub = makeFetchStub([]);
    vi.stubGlobal("fetch", stub.impl);
    renderRetour("/gold/retour");

    expect(screen.getByText(/il manque un morceau/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /vérifier mon abonnement/i })).toHaveAttribute(
      "href",
      "/compte",
    );
  });
});
