// Garde-fou des en-têtes de sécurité HTTP servis par nginx.
//
// nginx.conf n'est pas exécutable en vitest (pas de serveur ici) : ce test lit
// donc les fichiers nginx RÉELS (racine du repo, pas une copie) et verrouille
// leur contenu. Objectif : qu'un durcissement retiré par erreur (CSP affaiblie,
// script-src ouvert, HSTS activé à la va-vite, `include` oublié dans un bloc
// location…) fasse échouer la CI plutôt que de partir en prod en silence.
//
// La vérification runtime (headers réellement émis par nginx sur / , /assets/ ,
// route SPA) a été faite via un conteneur nginx:alpine servant dist/ ; ce test
// en est le filet statique pour éviter la régression.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// vitest s'exécute à la racine du repo (cwd) — on lit les fichiers nginx réels.
const ROOT = process.cwd();
const snippet = readFileSync(join(ROOT, "security-headers.conf"), "utf8");
const nginxConf = readFileSync(join(ROOT, "nginx.conf"), "utf8");

// Lignes ACTIVES du snippet (les commentaires `#` ne comptent pas).
const activeLines = snippet
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l.length > 0 && !l.startsWith("#"));

const cspLine = activeLines.find((l) => l.startsWith("add_header Content-Security-Policy")) ?? "";
const csp = cspLine.match(/"([^"]*)"/)?.[1] ?? "";

// CSP -> map { directive: valeur }.
const directives = new Map<string, string>();
for (const part of csp.split(";")) {
  const seg = part.trim();
  if (!seg) continue;
  const sp = seg.indexOf(" ");
  directives.set(sp === -1 ? seg : seg.slice(0, sp), sp === -1 ? "" : seg.slice(sp + 1).trim());
}

describe("En-têtes de sécurité HTTP (nginx)", () => {
  it("expose une Content-Security-Policy, appliquée même aux réponses d'erreur (always)", () => {
    expect(csp.length).toBeGreaterThan(0);
    expect(cspLine).toContain("always");
  });

  it("default-src verrouillé sur 'self'", () => {
    expect(directives.get("default-src")).toBe("'self'");
  });

  it("connect-src autorise le backend Supabase self-hosted de prod", () => {
    const connect = directives.get("connect-src") ?? "";
    expect(connect).toContain("'self'");
    // REST /rest/v1 + Edge /functions/v1 + refresh GoTrue /auth/v1 vivent tous
    // sous cet hôte. Si VITE_SUPABASE_URL change d'hôte, MAJ ici ET dans le README.
    expect(connect).toContain("https://api.spawt.online");
  });

  it("img-src / font-src : local uniquement (+ data: pour les images)", () => {
    expect(directives.get("img-src")).toContain("'self'");
    expect(directives.get("img-src")).toContain("data:");
    expect(directives.get("font-src")).toBe("'self'");
  });

  it("style-src autorise le inline (styles React) mais reste same-origin sinon", () => {
    const style = directives.get("style-src") ?? "";
    expect(style).toContain("'self'");
    expect(style).toContain("'unsafe-inline'");
  });

  it("script-src STRICT : 'self' seul, sans 'unsafe-inline' ni 'unsafe-eval'", () => {
    // Le build Vite n'injecte aucun script inline -> on garde la directive la
    // plus critique verrouillée. Ce test casse si quelqu'un l'ouvre.
    expect(directives.get("script-src")).toBe("'self'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("anti-clickjacking + neutralisation d'injection (frame-ancestors/object/base/form)", () => {
    expect(directives.get("frame-ancestors")).toBe("'none'");
    expect(directives.get("object-src")).toBe("'none'");
    expect(directives.get("base-uri")).toBe("'self'");
    expect(directives.get("form-action")).toBe("'self'");
  });

  it("en-têtes complémentaires présents (avec always)", () => {
    expect(snippet).toMatch(/add_header\s+X-Frame-Options\s+"DENY"\s+always;/);
    expect(snippet).toMatch(/add_header\s+X-Content-Type-Options\s+"nosniff"\s+always;/);
    expect(snippet).toMatch(
      /add_header\s+Referrer-Policy\s+"strict-origin-when-cross-origin"\s+always;/,
    );
    expect(snippet).toMatch(/add_header\s+Permissions-Policy\s+"[^"]*geolocation=\(\)[^"]*"\s+always;/);
  });

  it("HSTS n'est PAS posé au niveau applicatif (géré en amont par le proxy TLS)", () => {
    // Toléré uniquement en commentaire (ligne `#`). Aucune ligne ACTIVE.
    expect(activeLines.some((l) => l.startsWith("add_header Strict-Transport-Security"))).toBe(
      false,
    );
  });

  it("nginx.conf ré-inclut le snippet au niveau server ET dans chaque location", () => {
    // Piège nginx : un `add_header` dans un bloc enfant annule l'héritage des
    // `add_header` parents. Les 3 locations posent leur Cache-Control -> le
    // snippet DOIT être ré-inclus partout (server + /assets/ + /fonts/ + /).
    const occurrences = nginxConf.match(/include\s+\/etc\/nginx\/security-headers\.conf;/g) ?? [];
    expect(occurrences.length).toBeGreaterThanOrEqual(4);
  });
});
