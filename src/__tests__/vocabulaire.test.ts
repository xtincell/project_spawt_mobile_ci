// Le lint vocabulaire fait partie de la suite : la CI le lance aussi en étape
// dédiée, mais le garder ici garantit qu'un `npm test` local suffit à le voir.
import { describe, expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

// En environnement jsdom, import.meta.url n'est pas un file:// exploitable —
// Vitest lance la suite depuis la racine du repo, on résout donc via cwd.
const SCRIPT = resolve(process.cwd(), "scripts/lint-vocab.mjs");

describe("lint-vocab", () => {
  it("le portail respecte le dialecte SPAWT et la palette verrouillée", () => {
    // execFileSync jette si le script sort en code ≠ 0.
    const sortie = execFileSync(process.execPath, [SCRIPT], { encoding: "utf8" });
    expect(sortie).toContain("Vocabulaire SPAWT respecté");
  });
});
