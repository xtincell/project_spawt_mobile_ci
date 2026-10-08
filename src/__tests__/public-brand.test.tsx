import { afterEach, describe, expect, it, vi } from "vitest";
import { webcrypto, createHash } from "node:crypto";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { PUBLISHED_COPY, PublicBrandProvider, receivePublicBrand } from "../lib/public-brand";
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
});
