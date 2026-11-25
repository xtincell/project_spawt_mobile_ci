import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LeChaReview } from "../components/LeChaReview";

afterEach(() => { vi.restoreAllMocks(); });

describe("Cartes de la Bande", () => {
  it("garde la photo et l’identité au recto et réserve le témoignage et les réactions au verso", () => {
    render(<MemoryRouter><LeChaReview /></MemoryRouter>);
    const photo = screen.getByRole("img", { name: /sandwich grillé/ });
    expect(photo).toBeVisible();
    expect(screen.getByRole("img", { name: /devanture de Le Cha/ })).toBeVisible();
    expect(screen.getByText("Marcory · Abidjan")).toBeVisible();
    expect(screen.getByText("Goût original")).toBeVisible();
    expect(screen.getByText("Déco appréciée")).toBeVisible();
    expect(screen.getByText(/peu livrés à nous-mêmes/).closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("heading", { name: "Les réactions de Moka" })).toBeNull();
    expect(screen.getByRole("link", { name: "Lire l’avis dans SPAWT" })).toHaveAttribute("href", "/ouvrir/avis/le-cha-alexandre");
    fireEvent.click(screen.getByRole("button", { name: /lire le commentaire et les réactions sur Le Cha/i }));
    expect(screen.getByText(/peu livrés à nous-mêmes/)).toBeVisible();
    expect(screen.getByRole("heading", { name: "Les réactions de Moka" })).toBeVisible();
    expect(screen.getByRole("img", { name: /sandwich grillé/ })).toBe(photo);
    fireEvent.click(screen.getByRole("button", { name: "Revoir le lieu Le Cha" }));
    expect(screen.getByText(/peu livrés à nous-mêmes/).closest("[aria-hidden]")).toHaveAttribute("aria-hidden", "true");
  });

  it("sépare les trois adresses, leurs sources d’avis et leurs destinations Android", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Android");
    render(<MemoryRouter><LeChaReview /></MemoryRouter>);
    for (const name of ["Kaiten", "DipnDip"]) {
      fireEvent.click(screen.getByRole("button", { name }));
      expect(screen.getByRole("article", { name: "Carte de " + name })).toHaveAttribute("data-side", "recto");
      fireEvent.click(screen.getByRole("button", { name: "Lire le commentaire et les réactions sur " + name }));
      expect(screen.getByRole("heading", { name: "Les réactions de Moka" })).toBeVisible();
      if (name === "Kaiten") {
        expect(screen.getByText("Avis de terrain SPAWT")).toBeVisible();
        expect(screen.getByRole("link", { name: "Voir les avis dans SPAWT" }).getAttribute("href")).toContain("/reviews#Intent;");
      } else {
        expect(screen.getByRole("link", { name: /Résumé d’un avis Google/ })).toBeVisible();
        expect(screen.getByRole("link", { name: "Ouvrir le lieu dans SPAWT" }).getAttribute("href")).toContain("85433084-a972-563c-b9d1-6fac34f776d9#Intent;");
      }
    }
  });

  it("ouvre directement le verso du lien partagé et propose l’app à Android", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Android");
    render(<MemoryRouter><LeChaReview reader /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("L’avis sur Le Cha");
    expect(screen.getByText(/peu livrés à nous-mêmes/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ouvrir dans SPAWT" }).getAttribute("href")).toContain("intent://spawt.online/ouvrir/avis/le-cha-alexandre");
  });
});
