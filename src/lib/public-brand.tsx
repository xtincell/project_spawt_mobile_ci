/** Versioned public copy from the existing brand vault. No visitor data sent. */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { PUBLIC_BRAND_URL } from "./config";

export type BrandCopy = { name: string; title: string; tagline: string; description: string;
  logoUrl: string | null; links: Array<{ label: string; url: string }> };
export const PUBLISHED_COPY: BrandCopy = {
  name: "SPAWT", title: "La carte du bon goût",
  tagline: "Plus jamais le goumin d’un mauvais restau.",
  description: "SPAWT est un compagnon de découverte culinaire communautaire. Pas un catalogue, pas un annuaire : le bon lieu, au bon moment, pour toi.",
  logoUrl: null, links: [{ label: "@spawt.ci", url: "https://instagram.com/spawt.ci" }],
};
function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function exact(value: Record<string, unknown>, keys: string[]) {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}
function webUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2048) return false;
  try { const u = new URL(value); return u.protocol === "https:" && !u.username && !u.password && !u.search && !u.hash; }
  catch { return false; }
}
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (record(value)) return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value ?? null;
}
/** Match the publisher's canonical digest, scope and allowlist before rendering. */
export async function receivePublicBrand(value: unknown): Promise<BrandCopy | null> {
  if (!record(value) || !exact(value, ["schema", "slug", "edition", "version", "publishedAt", "selection", "digest", "content"])
    || value.schema !== "public-brand-v1" || value.slug !== "LFA-spawt" || value.selection !== "chosen"
    || typeof value.edition !== "string" || !Number.isInteger(value.version) || Number(value.version) < 1
    || typeof value.publishedAt !== "string" || !Number.isFinite(Date.parse(value.publishedAt))
    || typeof value.digest !== "string" || !/^[a-f0-9]{64}$/.test(value.digest)) return null;
  const c = value.content;
  if (!record(c) || !exact(c, ["name", "title", "tagline", "description", "logoUrl", "links"])) return null;
  for (const [key, max, required] of [["name", 160, true], ["title", 240, true], ["tagline", 600, false], ["description", 2400, false]] as const) {
    if (typeof c[key] !== "string" || c[key].length > max || (required && !c[key].trim())) return null;
  }
  if (c.logoUrl !== null && !webUrl(c.logoUrl)) return null;
  if (!Array.isArray(c.links) || c.links.length > 12 || c.links.some((l: unknown) => !record(l)
    || !exact(l, ["label", "url"]) || typeof l.label !== "string" || !l.label.trim() || l.label.length > 80 || !webUrl(l.url))) return null;
  const bytes = new TextEncoder().encode(JSON.stringify(canonical({ rawContent: null, rawData: c, extractedFields: null,
    certainty: null, fileName: null, sourceType: null, fileType: null })));
  const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  return digest === value.digest ? c as BrandCopy : null;
}

export async function fetchPublicBrand(signal: AbortSignal): Promise<BrandCopy | null> {
  const response = await fetch(PUBLIC_BRAND_URL, { signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-cache" });
  if (!response.ok || Number(response.headers.get("content-length") ?? 0) > 65536) return null;
  const text = await response.text();
  if (text.length > 65536) return null;
  return receivePublicBrand(JSON.parse(text) as unknown);
}
const PublicBrandContext = createContext(PUBLISHED_COPY);
export const usePublicBrand = () => useContext(PublicBrandContext);
export function PublicBrandProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState(PUBLISHED_COPY);
  useEffect(() => {
    let closed = false;
    let controller: AbortController | null = null;
    const refresh = async () => {
      controller?.abort(); controller = new AbortController();
      const own = controller;
      const timeout = setTimeout(() => own.abort(), 12000);
      try { const next = await fetchPublicBrand(own.signal); if (next && !closed && !own.signal.aborted) setContent(next); }
      catch { /* Keep the last edition; the page and quiz remain usable. */ }
      finally { clearTimeout(timeout); }
    };
    void refresh();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 300000);
    window.addEventListener("focus", refresh);
    return () => { closed = true; clearInterval(timer); controller?.abort(); window.removeEventListener("focus", refresh); };
  }, []);
  return <PublicBrandContext.Provider value={content}>{children}</PublicBrandContext.Provider>;
}
