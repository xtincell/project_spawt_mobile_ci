import { PUBLIC_BRAND_URL } from "./config";

export type IdentityFile = { url: string; hash: string; bytes: number; type: string };
type Font = { family: string; faces: Array<{ weight: number; file: IdentityFile }> };
export type PublicIdentity = { palette: Record<"ink" | "signature" | "community" | "paper" | "warm" | "soft", string> | null;
  typography: { display: Font; body: Font } | null;
  mascots: Array<{ role: "greeting" | "curious" | "guide"; alt: string; file: IdentityFile }>;
  voice: { quote: string; attribution: string } | null };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k));
const text = (v: unknown, max: number) => typeof v === "string" && !!v.trim() && v.length <= max;
const fontTypes = ["font/otf", "font/ttf"], imageTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

function file(v: unknown, edition: string, types: string[]) {
  if (!record(v) || !exact(v, ["url", "hash", "bytes", "type"]) || typeof v.hash !== "string" || !/^[a-f0-9]{64}$/.test(v.hash)
    || !Number.isInteger(v.bytes) || Number(v.bytes) < 1 || Number(v.bytes) > 10_000_000 || typeof v.type !== "string" || !types.includes(v.type) || typeof v.url !== "string") return false;
  try {
    const u = new URL(v.url), ext: Record<string, string> = { "font/otf": "otf", "font/ttf": "ttf", "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" };
    return u.origin === new URL(PUBLIC_BRAND_URL).origin && !u.username && !u.password && !u.search && !u.hash
      && u.pathname === `/brand/editions/${edition}/${v.hash}.${ext[v.type]}`;
  } catch { return false; }
}
/** Strict v2 boundary: no styles, private ids, arbitrary assets or foreign origins. */
export function validPublicIdentity(v: unknown, edition: string): v is PublicIdentity | null {
  if (v === null) return true;
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(edition) || !record(v) || !exact(v, ["palette", "typography", "mascots", "voice"])) return false;
  if (v.palette !== null && (!record(v.palette) || !exact(v.palette, ["ink", "signature", "community", "paper", "warm", "soft"])
    || Object.values(v.palette).some(c => typeof c !== "string" || !/^#[a-fA-F0-9]{6}$/.test(c)))) return false;
  if (v.typography !== null) {
    if (!record(v.typography) || !exact(v.typography, ["display", "body"])) return false;
    for (const font of Object.values(v.typography)) {
      if (!record(font) || !exact(font, ["family", "faces"]) || !text(font.family, 100) || !Array.isArray(font.faces) || !font.faces.length || font.faces.length > 6) return false;
      const weights = new Set();
      for (const face of font.faces) {
        if (!record(face) || !exact(face, ["weight", "file"]) || !Number.isInteger(face.weight) || Number(face.weight) < 100 || Number(face.weight) > 900
          || Number(face.weight) % 100 || weights.has(face.weight) || !file(face.file, edition, fontTypes)) return false;
        weights.add(face.weight);
      }
    }
  }
  if (!Array.isArray(v.mascots) || v.mascots.length > 3) return false;
  const roles = new Set();
  for (const mascot of v.mascots) {
    if (!record(mascot) || !exact(mascot, ["role", "alt", "file"]) || !["greeting", "curious", "guide"].includes(String(mascot.role))
      || roles.has(mascot.role) || !text(mascot.alt, 240) || !file(mascot.file, edition, imageTypes)) return false;
    roles.add(mascot.role);
  }
  return v.voice === null || (record(v.voice) && exact(v.voice, ["quote", "attribution"]) && text(v.voice.quote, 600) && text(v.voice.attribution, 120));
}
export async function identityFileBytes(file: IdentityFile, signal: AbortSignal) {
  const response = await fetch(file.url, { signal, credentials: "omit", referrerPolicy: "no-referrer", cache: "no-cache" });
  if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== file.type || Number(response.headers.get("content-length") ?? 0) > file.bytes || !response.body) throw new Error("Identity file unavailable");
  const reader = response.body.getReader(), chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) { const next = await reader.read(); if (next.done) break; size += next.value.length;
      if (size > file.bytes) throw new Error("Identity file too large"); chunks.push(next.value); }
  } finally { await reader.cancel().catch(() => {}); }
  if (size !== file.bytes) throw new Error("Identity file length mismatch");
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), b => b.toString(16).padStart(2, "0")).join("");
  if (hash !== file.hash) throw new Error("Identity file hash mismatch");
  return bytes;
}
export async function loadPublicIdentity(identity: PublicIdentity | null | undefined, signal: AbortSignal) {
  const fonts: FontFace[] = [], css: Record<string, string> = {}, images: Record<string, string> = {};
  if (!identity) return { fonts, css, images };
  if (identity.typography) for (const role of ["display", "body"] as const) {
    const font = identity.typography[role], family = `Shinkiro-${role}-${font.faces.map(face => face.file.hash.slice(0, 12)).join("-")}`;
    for (const face of font.faces) {
      const bytes = await identityFileBytes(face.file, signal);
      const loaded = await new FontFace(family, bytes.buffer as ArrayBuffer, { weight: String(face.weight), style: "normal" }).load();
      fonts.push(loaded);
    }
    css[`--font-${role}`] = `"${family}", ${role === "display" ? '"Arial Narrow"' : 'system-ui'}, sans-serif`;
  }
  for (const mascot of identity.mascots) {
    const bytes = await identityFileBytes(mascot.file, signal); let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 16384) binary += String.fromCharCode(...bytes.subarray(offset, offset + 16384));
    const dataUrl = `data:${mascot.file.type};base64,${btoa(binary)}`;
    const image = new Image(); image.referrerPolicy = "no-referrer"; image.src = dataUrl;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error("Identity image not decoded");
    images[mascot.role] = dataUrl;
  }
  if (identity.palette) {
    const c = identity.palette, rgb = (hex: string) => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16));
    const rgba = (hex: string, alpha: number) => `rgba(${rgb(hex).join(",")},${alpha})`;
    Object.assign(css, { "--noir": c.ink, "--or": c.signature, "--vert-chat": c.community, "--blanc-casse": c.paper, "--ambre": c.warm, "--creme-sable": c.soft,
      "--line": rgba(c.ink, .1), "--line-strong": rgba(c.ink, .18), "--line-inverse": rgba(c.paper, .16), "--scrim": rgba(c.ink, .55), "--header-bg": rgba(c.ink, .88),
      "--glow-or": rgba(c.signature, .3), "--dots-or": `radial-gradient(${rgba(c.signature, .35)} 1px, transparent 1px)`,
      "--dots-encre": `radial-gradient(${rgba(c.ink, .07)} 1px, transparent 1px)`, "--halo-or": `radial-gradient(circle, ${rgba(c.signature, .16)} 0%, ${rgba(c.signature, 0)} 70%)`,
      "--gr-gold": `linear-gradient(135deg, ${c.signature} 0%, var(--or-clair) 50%, ${c.signature} 100%)`,
      "--gr-sand": `linear-gradient(135deg, ${c.soft} 0%, ${c.paper} 100%)` });
  }
  return { fonts, css, images };
}
