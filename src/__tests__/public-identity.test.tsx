import { afterEach, describe, expect, it, vi } from "vitest";
import { createHash, webcrypto } from "node:crypto";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { PUBLISHED_COPY, PublicBrandProvider, receivePublicBrand, type BrandCopy } from "../lib/public-brand";
import { identityFileBytes, loadPublicIdentity, validPublicIdentity, type IdentityFile, type PublicIdentity } from "../lib/public-identity";
import LandingPage from "../pages/LandingPage";
import Layout from "../components/Layout";
import { palette } from "../theme/tokens";

const bytes = new TextEncoder().encode("verified fixture bytes");
const hash = createHash("sha256").update(bytes).digest("hex");
function file(type = "font/ttf", edition = "identity-one"): IdentityFile {
  return { url: `https://powerupgraders.com/brand/editions/${edition}/${hash}.${type === "font/ttf" ? "ttf" : "png"}`, hash, bytes: bytes.length, type };
}
function identity(id = "identity-one"): PublicIdentity {
  return { palette: { ink: palette.noir, signature: palette.or, community: palette.vertChat, paper: palette.blancCasse, warm: palette.ambre, soft: palette.cremeSable },
    typography: { display: { family: "Klinsman", faces: [{ weight: 700, file: file("font/ttf", id) }] }, body: { family: "Gotham", faces: [{ weight: 400, file: file("font/ttf", id) }] } },
    mascots: [{ role: "greeting", alt: "Moka reçu pour l’accueil", file: file("image/png", id) }],
    voice: { quote: "Ton chat a flairé un spot que tu n’as jamais testé.", attribution: "Moka, ton compagnon" } };
}
function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => [key, canonical(value)]));
  return v ?? null;
}
function edition(id = "identity-one", value: PublicIdentity | null = identity(id), patch: Partial<BrandCopy> = {}) {
  const content = { ...PUBLISHED_COPY, title: `Édition ${id}`, identity: value, ...patch };
  const digest = createHash("sha256").update(JSON.stringify(canonical({ rawContent: null, rawData: content, extractedFields: null, certainty: null, fileName: null, sourceType: null, fileType: null }))).digest("hex");
  return { schema: "public-brand-v2", slug: "LFA-spawt", edition: id, version: 1, publishedAt: "2026-10-09T00:00:00.000Z", selection: "chosen", digest, content };
}
function media() { return new Response(bytes, { headers: { "Content-Type": "font/ttf" } }); }
function browserDecoders() {
  const fontSet = new Set<FontFace>();
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("FontFace", class { constructor(public family: string, public source: ArrayBuffer, public descriptors: object) {} async load() { return this; } });
  vi.stubGlobal("Image", class { src = ""; referrerPolicy = ""; naturalWidth = 2; naturalHeight = 2; async decode() {} });
  Object.defineProperty(document, "fonts", { configurable: true, value: { add: (font: FontFace) => fontSet.add(font), delete: (font: FontFace) => fontSet.delete(font) } });
  return fontSet;
}
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete (document as unknown as { fonts?: unknown }).fonts; });
describe("Public identity reception", () => {
  it("receives V6 normally and a V7 links-only publication retaining the exact V6 identity", async () => {
    vi.stubGlobal("crypto", webcrypto);
    const before = { ...edition("identity-six"), version: 6 };
    const after = { ...edition("publication-seven", before.content.identity, { title: before.content.title, links: [...before.content.links, { label: "Parler à SPAWT", url: "https://powerupgraders.com/talk/spawt-public" }] }), version: 7 };
    expect(await receivePublicBrand(before)).toEqual(before.content);
    expect({ ...after.content, links: before.content.links }).toEqual(before.content);
    expect(await receivePublicBrand(after)).toEqual(after.content);
  });
  it("renders the new footer link after verifying a retained identity from one earlier source edition", async () => {
    browserDecoders();
    const before = edition("identity-six");
    const current = edition("publication-seven", before.content.identity, { title: before.content.title, links: [...before.content.links, { label: "Parler à SPAWT", url: "https://powerupgraders.com/talk/spawt-public" }] });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => Promise.resolve(url.includes("api/export") ? new Response(JSON.stringify(current)) : new Response(bytes, { headers: { "Content-Type": url.endsWith(".ttf") ? "font/ttf" : "image/png" } }))));
    render(<MemoryRouter><PublicBrandProvider><Routes><Route element={<Layout />}><Route path="/" element={<LandingPage />} /></Route></Routes></PublicBrandProvider></MemoryRouter>);
    expect((await screen.findByRole("link", { name: "Parler à SPAWT" })).getAttribute("href")).toBe("https://powerupgraders.com/talk/spawt-public");
    expect(screen.getByRole("heading", { level: 1, name: before.content.title })).toBeInTheDocument();
    expect(screen.getByAltText("Moka reçu pour l’accueil")).toHaveAttribute("src", expect.stringMatching(/^data:image\/png;base64,/));
  });
  it.each([
    `https://foreign.invalid/brand/editions/identity-six/${hash}.ttf`,
    `https://spawter@powerupgraders.com/brand/editions/identity-six/${hash}.ttf`,
    `https://powerupgraders.com/brand/editions/identity-six/${hash}.ttf?token=private`,
    `https://powerupgraders.com/brand/editions/identity-six/${hash}.ttf#fragment`,
    `https://powerupgraders.com/brand/editions/identity-six/${"0".repeat(64)}.ttf`,
    `https://powerupgraders.com/other/identity-six/${hash}.ttf`,
    `https://powerupgraders.com/brand/editions/identity-six/${hash}.png`,
    `https://powerupgraders.com/brand/editions/another-source/${hash}.ttf`,
  ])("refuses unsafe or mixed identity references in a retained publication: %s", url => {
    const value = identity("identity-six");
    value.typography!.body.faces[0].file.url = url;
    expect(validPublicIdentity(value, "publication-seven")).toBe(false);
  });
  it("receives all four public families and rejects private fields, foreign files, edition confusion and invalid shapes", async () => {
    vi.stubGlobal("crypto", webcrypto);
    expect(await receivePublicBrand(edition())).toEqual(edition().content);
    for (const bad of [ { ...identity(), privateSource: "do not export" },
      { ...identity(), palette: { ...identity().palette!, ink: "url(evil)" } },
      { ...identity(), mascots: [identity().mascots[0], identity().mascots[0]] },
      { ...identity(), typography: { ...identity().typography!, body: { family: "Gotham", faces: [{ weight: 400, file: { ...file(), url: "https://evil.invalid/font.ttf" } }] } } },
      { ...identity(), typography: { ...identity().typography!, body: { family: "Gotham", faces: [{ weight: 400, file: file("font/ttf", "another-edition") }] } } },
      { ...identity(), voice: { quote: "public", attribution: "Moka", fullCharter: "private" } } ]) expect(validPublicIdentity(bad, "identity-one")).toBe(false);
    expect(await receivePublicBrand({ ...edition(), content: { ...edition().content, identity: { ...identity(), voice: null } } })).toBeNull();
  });
  it("refuses corrupt, truncated, oversized and wrong-type bytes before decoding", async () => {
    vi.stubGlobal("crypto", webcrypto);
    for (const response of [new Response("wrong", { headers: { "Content-Type": "font/ttf" } }),
      new Response(new Uint8Array(bytes.length), { headers: { "Content-Type": "font/ttf" } }),
      new Response(new Uint8Array(bytes.length + 1), { headers: { "Content-Type": "font/ttf" } }),
      new Response(bytes, { headers: { "Content-Type": "text/html" } })]) {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
      await expect(identityFileBytes(file(), new AbortController().signal)).rejects.toThrow();
    }
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(media()));
    expect(Array.from(await identityFileBytes(file(), new AbortController().signal))).toEqual(Array.from(bytes));
  });
  it("does not install any resource when one decoder refuses the edition", async () => {
    const installed = browserDecoders();
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => new Response(bytes, { headers: { "Content-Type": url.endsWith(".ttf") ? "font/ttf" : "image/png" } })));
    vi.stubGlobal("Image", class { src = ""; referrerPolicy = ""; async decode() { throw new Error("broken image"); } });
    await expect(loadPublicIdentity(identity(), new AbortController().signal)).rejects.toThrow("broken image");
    expect(installed.size).toBe(0); expect(document.documentElement.style.getPropertyValue("--or")).toBe("");
  });
  it("applies a whole received identity and voice, keeps it on corruption, then restores local identity explicitly", async () => {
    const installed = browserDecoders(); let current = edition(), corrupt = false;
    const fetcher = vi.fn().mockImplementation((url: string) => url.includes("api/export")
      ? Promise.resolve(new Response(JSON.stringify(current)))
      : Promise.resolve(new Response(corrupt ? new Uint8Array(bytes.length) : bytes, { headers: { "Content-Type": url.endsWith(".ttf") ? "font/ttf" : "image/png" } })));
    vi.stubGlobal("fetch", fetcher);
    render(<MemoryRouter><PublicBrandProvider><LandingPage /></PublicBrandProvider></MemoryRouter>);
    await screen.findByRole("heading", { level: 1, name: "Édition identity-one" });
    expect(installed.size).toBe(2);
    expect(document.documentElement.style.getPropertyValue("--font-body")).toContain("Shinkiro-body-");
    expect(document.documentElement.style.getPropertyValue("--or")).toBe(palette.or);
    expect(screen.getByAltText("Moka reçu pour l’accueil").getAttribute("src")).toMatch(/^data:image\/png;base64,/);
    expect(screen.getByText(identity().voice!.quote)).toBeInTheDocument(); expect(screen.getByText(/six questions/i)).toBeInTheDocument();
    const calls = fetcher.mock.calls.length; fireEvent(window, new Event("focus"));
    await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(calls + 1));
    current = edition("identity-two"); corrupt = true; fireEvent(window, new Event("focus"));
    await waitFor(() => expect(fetcher.mock.calls.length).toBeGreaterThan(calls + 2));
    expect(screen.getByRole("heading", { level: 1, name: "Édition identity-one" })).toBeInTheDocument(); expect(installed.size).toBe(2);
    current = edition("returned-local", null); fireEvent(window, new Event("focus"));
    await screen.findByRole("heading", { level: 1, name: "Édition returned-local" });
    expect(installed.size).toBe(0); expect(document.documentElement.style.getPropertyValue("--or")).toBe("");
    expect(screen.getByAltText(/Moka.*salue/)).toHaveAttribute("src", "/brand/moka-salut.webp");
  });
  it("keeps the prior edition on a failed browser font decoder", async () => {
    browserDecoders();
    vi.stubGlobal("FontFace", class { async load() { throw new Error("font refused"); } });
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => Promise.resolve(url.includes("api/export") ? new Response(JSON.stringify(edition())) : media())));
    render(<MemoryRouter><PublicBrandProvider><LandingPage /></PublicBrandProvider></MemoryRouter>);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("heading", { level: 1, name: PUBLISHED_COPY.title })).toBeInTheDocument();
    expect(screen.getByAltText(/Moka.*salue/)).toHaveAttribute("src", "/brand/moka-salut.webp");
  });
});
