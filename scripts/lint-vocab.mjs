#!/usr/bin/env node
// Audit anti-drift vocabulaire SPAWT — version portail web.
// Adapté de app/scripts/lint-vocab.mjs (repo mobile, Moka §4.3) : scan `src/`
// (TS/TSX/CSS), mêmes principes (commentaires ignorés, exceptions explicites).
// Deux familles de règles :
//   1. Vocabulaire : les mots interdits par le dialecte SPAWT.
//   2. Direction artistique : aucun hex hors de src/theme/tokens.{ts,css}.
// Usage : node scripts/lint-vocab.mjs  (branché sur `npm run lint:vocab` + CI)

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath gère drive letter Windows + décodage %20 (cf. historique du
// script mobile : .pathname laissait %20 non décodé → linter no-op silencieux).
const ROOT = fileURLToPath(new URL("../", import.meta.url));

// Strip les commentaires (// pleine ligne + blocs /* */) en préservant les
// numéros de ligne : un linter de vocab PRODUIT ne doit pas flaguer la
// documentation interne qui nomme les règles interdites.
// `bientot/index.html` est une page AUTONOME : un seul fichier, sans build, sans
// dépendance réseau (sa CSP porte `connect-src 'none'`). Elle ne peut donc pas
// importer le fichier de tokens — son bloc `:root` EST son site de déclaration.
//
// On neutralise ce bloc-là, et RIEN d'autre : un hex qui traîne plus bas dans
// la feuille reste une erreur. C'est important — la divergence de palette de
// cette page (or #E8B23A au lieu de #C8A44E) vivait justement dans des règles
// éparpillées, et une exception posée sur le fichier entier l'aurait laissée
// passer une seconde fois.
const FICHIERS_DECLARANT_LEURS_TOKENS = ["bientot/index.html"];

function stripRootBlock(src, relPath) {
  if (!FICHIERS_DECLARANT_LEURS_TOKENS.some((f) => relPath.includes(f))) return src;
  return src.replace(/:root\s*\{[^}]*\}/g, (m) => m.replace(/[^\n]/g, " "));
}

function stripComments(src) {
  const noBlocks = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  return noBlocks
    .split("\n")
    .map((line) => (/^\s*\/\//.test(line) ? "" : line))
    .join("\n");
}

// `bientot/` est scanné aussi : c'est la seule page PUBLIQUE du produit, et
// c'est justement celle qui échappait au linter tant qu'elle vivait hors dépôt.
// Elle disait « restaurant » deux fois, dont une dans la meta description
// lue par Google.
const SCAN_DIRS = ["src", "bientot"];
const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".html"]);

// Patterns interdits avec exceptions explicites (chemins relatifs au repo).
const FORBIDDEN = [
  {
    pattern: /\brestaurant(s)?\b/gi,
    name: "restaurant",
    message: "Utiliser 'lieu', 'spot', 'maquis' ou 'table' (dialecte SPAWT)",
    allowFiles: [],
  },
  {
    // \b protège les champs techniques (user_id, userEvent) : seuls le mot
    // isolé « user »/« users » est interdit dans le code et les textes.
    pattern: /\busers?\b/gi,
    name: "user",
    message: "Utiliser 'spawter' (dialecte SPAWT)",
    allowFiles: [],
  },
  {
    pattern: /\bcheck-?in(s)?\b/gi,
    name: "check-in",
    message: "Utiliser 'spawt' (dialecte SPAWT)",
    allowFiles: [],
  },
  {
    pattern: /\bgastronom/gi,
    name: "gastronomie",
    message: "Parler de 'bon goût', de 'cuisine', jamais de gastronomie",
    allowFiles: [],
  },
  {
    pattern: /\bleaderboard\b|\branking\b|\bclassement\b/gi,
    name: "compétition",
    message: "Mécanique compétitive interdite (Contrat à la Tribu)",
    allowFiles: [],
  },
  {
    pattern: /\bgamif/gi,
    name: "gamification",
    message: "SPAWT ne gamifie pas",
    allowFiles: [],
  },
  {
    // DA verrouillée : la palette vit dans src/theme/tokens.{ts,css} et
    // NULLE PART ailleurs. #abc / #aabbcc / #aabbccdd, insensible à la casse.
    pattern: /#[0-9a-f]{3,8}\b/gi,
    name: "hex hors tokens",
    message: "Aucun hex hors src/theme/tokens.ts et src/theme/tokens.css : utiliser var(--...) ou le module tokens",
    allowFiles: ["theme/tokens.ts", "theme/tokens.css"],
  },
];

let errors = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (entry === "node_modules" || entry === "dist") continue;
      walk(full);
    } else if (EXTENSIONS.has(extname(entry))) {
      checkFile(full);
    }
  }
}

function checkFile(path) {
  const brut = stripComments(readFileSync(path, "utf8"));
  // Normalise les séparateurs (\ Windows → /) pour un comportement identique
  // en local Windows et en CI Linux.
  const relPath = path.replace(ROOT, "").replace(/\\/g, "/");
  const content = stripRootBlock(brut, relPath);
  for (const rule of FORBIDDEN) {
    if (rule.allowFiles.some((a) => relPath.includes(a))) continue;
    rule.pattern.lastIndex = 0;
    let match;
    while ((match = rule.pattern.exec(content)) !== null) {
      const lineNum = content.slice(0, match.index).split("\n").length;
      console.error(
        `❌ ${relPath}:${lineNum} — '${match[0]}' interdit (${rule.name}). ${rule.message}`,
      );
      errors++;
    }
  }
}

for (const d of SCAN_DIRS) {
  try {
    walk(join(ROOT, d));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
}

if (errors > 0) {
  console.error(`\n${errors} occurrence(s) interdite(s). Le dialecte SPAWT n'est pas négociable.`);
  process.exit(1);
} else {
  console.log("✓ Vocabulaire SPAWT respecté, palette verrouillée.");
}
