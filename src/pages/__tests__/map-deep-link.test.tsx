import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { PublicPlace } from "../../lib/public-places";
import { loadPublicPlaces } from "../../lib/public-places";
import MapPage from "../MapPage";

const mapMocks = vi.hoisted(() => ({ flyTo: vi.fn(), scrollIntoView: vi.fn() }));

vi.mock("../../lib/public-places", () => ({ loadPublicPlaces: vi.fn() }));
vi.mock("maplibre-gl", () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    addControl() {}
    on() {}
    remove() {}
    flyTo = mapMocks.flyTo;
  },
  NavigationControl: class {},
  Marker: class {
    setLngLat() { return this; }
    addTo() { return this; }
    remove() {}
  },
}));

const places: PublicPlace[] = [
  { id: "spot-cocody", name: "Table Cocody", cuisine: ["Ivoirienne"], lat: 5.36, lng: -3.98, neighborhood: "Cocody", descriptive_address: "Rue des Jardins, Cocody", city: "Abidjan" },
  { id: "spot-marcory", name: "Table Marcory", cuisine: ["Grillades"], lat: 5.29, lng: -3.99, neighborhood: "Marcory", descriptive_address: "Zone 4, Marcory", city: "Abidjan" },
];
const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {configurable: true, value: mapMocks.scrollIntoView});
});

afterEach(() => {
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

describe("Carte — liens directs", () => {
  it("attend les données, filtre le quartier et ouvre une fiche accessible sans la rouvrir après fermeture", async () => {
    let resolvePlaces!: (value: PublicPlace[]) => void;
    vi.mocked(loadPublicPlaces).mockReturnValue(new Promise(resolve => { resolvePlaces = resolve; }));
    render(<MemoryRouter initialEntries={["/carte?lieu=spot-cocody&q=Cocody"]}><MapPage /></MemoryRouter>);

    expect(screen.getByRole("searchbox")).toHaveValue("Cocody");
    expect(screen.queryByRole("region", { name: "Fiche Table Cocody" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Ce lieu n’est pas disponible/)).not.toBeInTheDocument();

    await act(async () => resolvePlaces(places));
    const fiche = await screen.findByRole("region", { name: "Fiche Table Cocody" });
    await waitFor(() => expect(fiche).toHaveFocus());
    expect(mapMocks.scrollIntoView).toHaveBeenCalledWith({behavior: "instant", block: "start"});
    expect(mapMocks.flyTo).toHaveBeenCalledWith({center: [-3.98, 5.36], zoom: 14, essential: false});
    expect(screen.getByRole("button", { name: /Table Cocody/ })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: /Table Marcory/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Fermer la fiche" }));
    fireEvent.change(screen.getByRole("searchbox"), {target: {value: ""}});
    expect(screen.queryByRole("region", { name: "Fiche Table Cocody" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Table Marcory/ })).toBeInTheDocument();
  });

  it("amène la fiche dans la fenêtre après un clic et rend le focus à la même adresse à la fermeture", async () => {
    vi.mocked(loadPublicPlaces).mockResolvedValue(places);
    render(<MemoryRouter initialEntries={["/carte"]}><MapPage /></MemoryRouter>);
    const card = await screen.findByRole("button", { name: /Table Marcory/ });
    fireEvent.click(card);
    const fiche = await screen.findByRole("region", { name: "Fiche Table Marcory" });
    await waitFor(() => expect(fiche).toHaveFocus());
    expect(mapMocks.scrollIntoView).toHaveBeenCalledWith({behavior: "instant", block: "start"});
    fireEvent.click(screen.getByRole("button", { name: "Fermer la fiche" }));
    expect(card).toHaveFocus();
    expect(mapMocks.scrollIntoView).toHaveBeenLastCalledWith({behavior: "instant", block: "center"});
  });

  it("signale un lieu inconnu tout en laissant les autres adresses accessibles", async () => {
    vi.mocked(loadPublicPlaces).mockResolvedValue(places);
    render(<MemoryRouter initialEntries={["/carte?lieu=inconnu"]}><MapPage /></MemoryRouter>);
    expect(await screen.findByText(/Ce lieu n’est pas disponible dans les adresses publiées/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Table Cocody/ })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: /^Fiche / })).not.toBeInTheDocument();
  });
});
