import { afterEach, describe, expect, it, vi } from "vitest";
import { webcrypto, createHash } from "node:crypto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { PUBLISHED_COPY, PublicBrandProvider, receivePublicBrand } from "../lib/public-brand";
import Layout from "../components/Layout";
import LandingPage from "../pages/LandingPage";

function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, value]) => [k, canonical(value)]));
  return v ?? null;
}
function edition(patch = {}) {
  const content = { ...PUBLISHED_COPY, title: "La table choisie ensemble", ...patch };
  const digest = createHash("sha256").update(JSON.stringify(canonical({ rawContent: null, rawData: content,
    extractedFields: null, certainty: null, fileName: null, sourceType: null, fileType: null }))).digest("hex");
  return { schema: "public-brand-v1", slug: "LFA-spawt", edition: "edition-one", version: 1,
    selection: "chosen", publishedAt: "2026-10-08T00:00:00.000Z", digest, content };
}
afterEach(() => { vi.unstubAllGlobals(); });
function renderSite() {
  return render(<MemoryRouter><PublicBrandProvider><Routes><Route element={<Layout />}>
    <Route path="/" element={<LandingPage />} /></Route></Routes></PublicBrandProvider></MemoryRouter>);
}
const selectedLogo = "https://powerupgraders.com/brand/spawt/logos/logo-contour-horizontal.png";
describe("Public brand reception", () => {
  it("receives the exact published copy and digest", async () => {
    vi.stubGlobal("crypto", webcrypto);
    expect(await receivePublicBrand(edition())).toEqual(edition().content);
  });
  it("rejects another brand, an observed legacy edition, private fields and altered content", async () => {
    vi.stubGlobal("crypto", webcrypto);
    for (const value of [{ ...edition(), slug: "LFA-other" }, { ...edition(), selection: "observed" },
      { ...edition(), privateSources: [] }, { ...edition(), content: { ...edition().content, title: "Altered without a publication" } },
      edition({ links: [{ label: "Private", url: "https://example.invalid/?token=secret" }] })]) {
      expect(await receivePublicBrand(value)).toBeNull();
    }
  });
  it("updates the rendered hero without changing six questions or the Moka asset", async () => {
    vi.stubGlobal("crypto", webcrypto); vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(edition()))));
    render(<MemoryRouter><PublicBrandProvider><LandingPage /></PublicBrandProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1, name: PUBLISHED_COPY.title })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: "La table choisie ensemble" })).toBeInTheDocument());
    expect(screen.getByText(/six questions/i)).toBeInTheDocument();
    expect(screen.getByAltText(/Moka.*salue/)).toHaveAttribute("src", "/brand/moka-salut.webp");
  });
  it("keeps the live page and quiz usable when the brand service is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    render(<MemoryRouter><PublicBrandProvider><LandingPage /></PublicBrandProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole("heading", { level: 1, name: PUBLISHED_COPY.title })).toBeInTheDocument());
    expect(screen.getAllByRole("link").some((link) => link.getAttribute("href") === "https://quiz.spawt.online")).toBe(true);
    expect(screen.queryByText(/00:00|0 jours/i)).not.toBeInTheDocument();
  });
  it("renders the chosen logo in both brand positions and falls back on a failed image", async () => {
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(edition({ logoUrl: selectedLogo })))));
    renderSite();
    await waitFor(() => expect(document.querySelectorAll(`img[src="${selectedLogo}"]`)).toHaveLength(2));
    for (const img of document.querySelectorAll(`img[src="${selectedLogo}"]`)) fireEvent.error(img);
    expect(document.querySelectorAll('img[src="/brand/logo-horizontal-dark.webp"]')).toHaveLength(2);
    expect(screen.getByText(/six questions/i)).toBeInTheDocument();
  });
  it("changes and restores the rendered logo with editions while ignoring a late old response", async () => {
    vi.stubGlobal("crypto", webcrypto);
    let finishOld!: (response: Response) => void;
    const newer = "https://powerupgraders.com/brand/spawt/logos/logo-contour-wordmark.png";
    const fetcher = vi.fn().mockImplementationOnce(() => new Promise<Response>((resolve) => { finishOld = resolve; }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...edition({ logoUrl: newer }), edition: "edition-two", version: 2 })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ...edition({ logoUrl: selectedLogo }), edition: "restored-three", version: 3 })));
    vi.stubGlobal("fetch", fetcher); renderSite();
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(document.querySelectorAll(`img[src="${newer}"]`)).toHaveLength(2));
    finishOld(new Response(JSON.stringify(edition({ logoUrl: selectedLogo }))));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(document.querySelectorAll(`img[src="${newer}"]`)).toHaveLength(2);
    fireEvent(window, new Event("focus"));
    await waitFor(() => expect(document.querySelectorAll(`img[src="${selectedLogo}"]`)).toHaveLength(2));
    expect(screen.getAllByRole("link").some((l) => l.getAttribute("href") === "https://quiz.spawt.online")).toBe(true);
  });
  it("keeps the published text but never embeds foreign or private media addresses", async () => {
    vi.stubGlobal("crypto", webcrypto);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(edition({ logoUrl: "https://evil.invalid/logo.png" })))));
    renderSite();
    await screen.findByRole("heading", { level: 1, name: "La table choisie ensemble" });
    expect(document.querySelectorAll('img[src="https://evil.invalid/logo.png"]')).toHaveLength(0);
    expect(document.querySelectorAll('img[src="/brand/logo-horizontal-dark.webp"]')).toHaveLength(2);
  });

});
