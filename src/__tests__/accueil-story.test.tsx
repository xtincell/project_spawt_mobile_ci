import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { InsideSpawt } from "../components/InsideSpawt";
import { CityStory, PalaisStory } from "../components/AccueilStory";

it("relie chaque geste de l’app à son aperçu et à son explication", () => {
  render(<InsideSpawt />);
  const choices = within(screen.getByRole("group", { name: "Parcourir les écrans de SPAWT" }));
  for (const [action, description] of [
    ["Choisir", /la fiche de Le Cha/i], ["Garder", /Mes envies/i], ["Repérer", /carte des adresses/i],
  ] as const) {
    const button = choices.getByRole("button", { name: action });
    fireEvent.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img", { name: description })).toBeVisible();
    expect(choices.getAllByRole("button", { pressed: true })).toHaveLength(1);
  }
});

it("présente la promesse et les portraits du Palais sans détour vers le jeu", () => {
  render(<><CityStory /><PalaisStory /></>);
  expect(screen.getByText(/l’app gratuite pour choisir où manger/i)).toBeVisible();
  const palais = within(screen.getByRole("region", { name: /À chacun son Palais/i }));
  expect(palais.getByText("Pisteur de Rue")).toBeVisible();
  expect(palais.getByText("Gardien du Maquis")).toBeVisible();
  expect(palais.queryByRole("link")).toBeNull();
});
