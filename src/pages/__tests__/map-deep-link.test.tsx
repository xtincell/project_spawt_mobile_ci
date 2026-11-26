import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { PublicPlace } from "../../lib/public-places";
import { loadPublicPlaces } from "../../lib/public-places";
import { loadLinkedPlace, loadPlaceContact, loadPlaceMenu, loadPractical, loadReviewStats, parsePlaceContact } from "../../lib/place-details";
import MapPage from "../MapPage";

const mapMocks = vi.hoisted(() => ({ created: vi.fn(), flyTo: vi.fn(), scrollIntoView: vi.fn() }));

vi.mock("../../lib/public-places", () => ({ loadPublicPlaces: vi.fn() }));
vi.mock("../../lib/place-details", async (original) => ({
  ...await original<typeof import("../../lib/place-details")>(),
  loadLinkedPlace: vi.fn(), loadPlaceContact: vi.fn(), loadPractical: vi.fn(), loadPlaceMenu: vi.fn(), loadReviewStats: vi.fn(),
}));
vi.mock("maplibre-gl", () => ({
  setWorkerUrl: vi.fn(),
  Map: class {
    constructor() { mapMocks.created(); }
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
  vi.mocked(loadPlaceContact).mockResolvedValue(parsePlaceContact({}));
  vi.mocked(loadPractical).mockImplementation(async () => ({ website:null,maps:null,email:null,description:'',socials:[],services:[],payments:[],sources:[] }));
  vi.mocked(loadPlaceMenu).mockResolvedValue([]);
  vi.mocked(loadReviewStats).mockResolvedValue(null);
  vi.stubGlobal("WebGL2RenderingContext", class {});
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({ getExtension: () => null } as unknown as WebGL2RenderingContext);
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {configurable: true, value: mapMocks.scrollIntoView});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
});

describe("Carte — liens directs", () => {
  const uuid = "c5acfd12-01dd-5cd3-9beb-0531d89c3e99";
  const directPlace = { ...places[0], id: uuid };
  const received = () => ({ place: directPlace, contact: parsePlaceContact({ phone:'+2250701020304' }) });
  it.each(['en attente', 'en panne'])('ouvre le lien UUID, même avec le catalogue %s', async mode => {
    let resume!: (rows: PublicPlace[]) => void;
    vi.mocked(loadPublicPlaces).mockImplementation(() => mode === 'en panne' ? Promise.reject(new Error()) : new Promise(done => { resume = done; }));
    vi.mocked(loadLinkedPlace).mockResolvedValue(received());
    render(<MemoryRouter initialEntries={['/carte?lieu=' + uuid]}><MapPage /></MemoryRouter>);
    const sheet = await screen.findByRole('region', {name:'Fiche Table Cocody'});
    await waitFor(() => expect(sheet).toHaveFocus());
    expect(screen.getByRole('link',{name:'Appeler'})).toHaveAttribute('href','tel:+2250701020304');
    expect(screen.getByRole('link',{name:'Itinéraire'})).toBeInTheDocument();
    if (mode === 'en attente') await act(async () => resume([directPlace]));
    else expect(screen.getByRole('alert')).toHaveTextContent('Les adresses sont indisponibles');
    expect(screen.getByRole('region', {name:'Fiche Table Cocody'})).toBe(sheet);
    expect(loadLinkedPlace).toHaveBeenCalledTimes(1);
    expect(loadPlaceContact).not.toHaveBeenCalled();
    for (const load of [loadPlaceMenu, loadPractical, loadReviewStats]) expect(load).toHaveBeenCalledTimes(1);
  });

  it('ouvre le résumé quand le catalogue arrive en premier et garde la fermeture lors de la réponse ciblée', async () => {
    let done!: (value: ReturnType<typeof received>) => void;
    vi.mocked(loadPublicPlaces).mockResolvedValue([directPlace]);
    vi.mocked(loadLinkedPlace).mockImplementation(() => new Promise(resolve => { done = resolve; }));
    render(<MemoryRouter initialEntries={['/carte?lieu=' + uuid]}><MapPage /></MemoryRouter>);
    await screen.findByRole('region', {name:'Fiche Table Cocody'});
    expect(loadPlaceContact).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Fermer la fiche'}));
    await act(async () => done(received()));
    expect(screen.queryByRole('region', {name:'Fiche Table Cocody'})).toBeNull();
    expect(screen.getByRole('button',{name:/Table Cocody/})).toHaveFocus();
  });
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
    await waitFor(() => expect(mapMocks.flyTo).toHaveBeenCalledWith({center: [-3.98, 5.36], zoom: 14, essential: false}));
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

  it("ouvre le lien direct et conserve les actions de la fiche sans initialiser un moteur sans WebGL", async () => {
    vi.mocked(HTMLCanvasElement.prototype.getContext).mockReturnValue(null);
    vi.mocked(loadPublicPlaces).mockResolvedValue(places);
    render(<MemoryRouter initialEntries={["/carte?lieu=spot-cocody"]}><MapPage /></MemoryRouter>);
    const fiche = await screen.findByRole("region", {name: "Fiche Table Cocody"});
    await waitFor(() => expect(fiche).toHaveFocus());
    expect(screen.getByRole("link", {name:"Itinéraire"})).toHaveAttribute("href", "https://www.google.com/maps/dir/?api=1&destination=5.36%2C-3.98");
    expect(mapMocks.created).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Fermer la fiche"}));
    expect(screen.getByRole("button", {name:/Table Cocody/})).toHaveFocus();
  });
});
