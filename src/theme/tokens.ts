// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SPAWT Portail — Tokens de thème (SOURCE UNIQUE côté TS)
// Palette CANONIQUE alignée sur l'app mobile (app/src/theme/tokens.ts,
// brandbook v1.0). ⚠️ Les valeurs du PRD §15 (#D4AF37 / #50C878) sont
// périmées — ne jamais les réintroduire.
// Règle auditée (scripts/lint-vocab.mjs) : AUCUN hex hors de ce fichier
// et de ./tokens.css. Côté composants, consommer les variables CSS
// (var(--...)) ou, pour les rares usages JS (ex. confetti), ce module.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ── Palette canonique ─────────────────────────────────
export const palette = {
  // Primaires
  noir: "#0A0A0A",
  or: "#C8A44E",
  orClair: "#E8D5A0",
  // Secondaires
  vertChat: "#2D6B4F",
  vertChatProfond: "#1F4D39",
  blancCasse: "#FAFAF8",
  // Accents
  cremeSable: "#EFE8DC",
  // Neutres
  blancPur: "#FFFFFF",
  graphite: "#333333",
  grisMoyen: "#8A8A8A",
  // États
  erreur: "#B3261E", // rouge d'erreur du portail (AA sur fonds clairs)
} as const;

// ── Tokens sémantiques (par usage, jamais par couleur) ─
export const tokens = {
  brand: {
    primary: palette.or,
    accent: palette.vertChat,
  },
  surface: {
    base: palette.blancCasse,
    raised: palette.blancPur,
    subtle: palette.cremeSable,
    inverse: palette.noir,
  },
  text: {
    primary: palette.noir,
    secondary: palette.graphite,
    tertiary: palette.grisMoyen,
    inverse: palette.blancCasse,
    inverseSecondary: palette.orClair,
    // Sur fond or : texte noir (AA). Sur fond vert chat : texte blanc cassé (AA ≈ 6,3:1).
    onBrand: palette.noir,
  },
  state: {
    success: palette.vertChat,
    danger: palette.erreur,
  },
} as const;

// Couleurs du confetti sobre de /gold/retour (usage JS, cf. Confetti.tsx).
export const confettiColors = [
  palette.or,
  palette.orClair,
  palette.vertChat,
  palette.cremeSable,
] as const;

export type Palette = typeof palette;
export type Tokens = typeof tokens;
