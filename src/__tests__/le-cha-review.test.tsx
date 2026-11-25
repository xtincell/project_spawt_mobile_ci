import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { LeChaReview } from "../components/LeChaReview";

afterEach(() => { vi.restoreAllMocks(); });

describe("Le Cha", () => {
  it("distingue la photo du repas et la devanture et ouvre l’avis précis", () => {
    render(<MemoryRouter><LeChaReview /></MemoryRouter>);
    expect(screen.getByRole("img", { name: /sandwich grillé/ })).toBeVisible();
    expect(screen.getByRole("img", { name: /devanture de Le Cha/ })).toBeVisible();
    expect(screen.getByText("Marcory · Abidjan")).toBeVisible();
    expect(screen.getByRole("link", { name: "Lire l’avis dans SPAWT" })).toHaveAttribute("href", "/ouvrir/avis/le-cha-alexandre");
  });

  it("laisse l’avis lisible et permet une ouverture Android explicite", () => {
    vi.spyOn(window.navigator, "userAgent", "get").mockReturnValue("Android");
    render(<MemoryRouter><LeChaReview reader /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("L’avis d’Alexandre");
    expect(screen.getByText(/peu livrés à nous-mêmes/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ouvrir dans SPAWT" }).getAttribute("href"))
      .toMatch(/^intent:\/\/spawt\.online\/ouvrir\/avis\/le-cha-alexandre#Intent;scheme=https;package=com\.upgraders\.spawt;/);
  });
});
