// Test de la page checkout : contrat payment-checkout mocké (succès +
// erreurs 401 / 409 / 502) et redirection vers la page CinetPay.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import CheckoutPage from "../CheckoutPage";
import * as api from "../../lib/api";
import {
  makeFetchStub,
  checkoutOk,
  checkoutExpired,
  checkoutAlreadyActive,
  checkoutProviderError,
} from "../../test/fetch-stub";

// redirectTo espionné (window.location.assign n'est pas implémenté en jsdom).
vi.mock("../../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../lib/api")>();
  return { ...actual, redirectTo: vi.fn() };
});

// Session factice : la page est derrière RequireAuth en prod, ici on mocke
// directement le hook pour tester le comportement checkout.
const signOut = vi.fn(async () => {});
vi.mock("../../providers/AuthProvider", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../providers/AuthProvider")>();
  return {
    ...actual,
    useAuth: () => ({
      session: { access_token: "jeton-spawter" },
      loading: false,
      signOut,
    }),
  };
});

function renderCheckout() {
  return render(
    <MemoryRouter initialEntries={["/gold/paiement"]}>
      <Routes>
        <Route path="/gold/paiement" element={<CheckoutPage />} />
        <Route path="/connexion" element={<h1>Page connexion</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("CheckoutPage", () => {
  beforeEach(() => {
    vi.mocked(api.redirectTo).mockClear();
    signOut.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("succès : appelle payment-checkout puis redirige vers payment_url", async () => {
    const stub = makeFetchStub([{ urlIncludes: "payment-checkout", respond: () => checkoutOk() }]);
    vi.stubGlobal("fetch", stub.impl);
    renderCheckout();

    // L'annuel est présélectionné ; on bascule sur le mensuel.
    fireEvent.click(screen.getByRole("radio", { name: /mensuel/i }));
    fireEvent.click(screen.getByRole("button", { name: /payer avec mobile money/i }));

    await waitFor(() => {
      expect(api.redirectTo).toHaveBeenCalledWith("https://checkout.cinetpay.example/txn-test-001");
    });
    expect(stub.calls[0].body).toMatchObject({ plan: "gold_monthly" });
    expect((stub.calls[0].body as { return_url: string }).return_url).toContain("/gold/retour");
    const headers = stub.calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer jeton-spawter");
  });

  it("401 : session expirée → signOut + renvoi vers /connexion", async () => {
    const stub = makeFetchStub([{ urlIncludes: "payment-checkout", respond: checkoutExpired }]);
    vi.stubGlobal("fetch", stub.impl);
    renderCheckout();

    fireEvent.click(screen.getByRole("button", { name: /payer avec mobile money/i }));

    expect(await screen.findByText("Page connexion")).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
    expect(api.redirectTo).not.toHaveBeenCalled();
  });

  it("409 already_active : écran « déjà Gold » avec lien compte", async () => {
    const stub = makeFetchStub([{ urlIncludes: "payment-checkout", respond: checkoutAlreadyActive }]);
    vi.stubGlobal("fetch", stub.impl);
    renderCheckout();

    fireEvent.click(screen.getByRole("button", { name: /payer avec mobile money/i }));

    expect(await screen.findByText(/déjà gold/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /voir mon abonnement/i })).toHaveAttribute(
      "href",
      "/compte",
    );
    expect(api.redirectTo).not.toHaveBeenCalled();
  });

  it("502 provider_error : message + possibilité de réessayer", async () => {
    const stub = makeFetchStub([{ urlIncludes: "payment-checkout", respond: checkoutProviderError }]);
    vi.stubGlobal("fetch", stub.impl);
    renderCheckout();

    fireEvent.click(screen.getByRole("button", { name: /payer avec mobile money/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/rien n'a été débité/i);
    // Le bouton reste disponible pour réessayer.
    expect(screen.getByRole("button", { name: /payer avec mobile money/i })).toBeEnabled();
    expect(api.redirectTo).not.toHaveBeenCalled();
  });
});
