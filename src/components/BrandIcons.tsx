// Pictos de section — dessinés dans le style du jeu d'icônes officiel :
// trait régulier 1,6px, bouts et jonctions arrondis, grille 24px.
//
// Pourquoi pas le jeu officiel des 151 pictos : ce ne sont pas des vecteurs.
// Les fichiers `assets/icons/<nom>.svg` du design system sont des découpes
// (`<image href="icons-sprite.png">`) d'un sprite raster de 924×540, soit
// ~39×40 px par picto — net en 1x sur un écran d'app, visiblement flou dès
// qu'on l'agrandit sur une page web en retina. On garde donc la GRAMMAIRE
// du jeu (trait, grille, arrondis) et on dessine les 3 pictos dont la
// vitrine a besoin.
//
// `currentColor` partout : aucune couleur en dur, la couleur vient du CSS
// parent (`.card__icon`). C'est aussi ce qui satisfait la règle « aucun hex
// hors tokens » de scripts/lint-vocab.mjs.

interface IconProps {
  size?: number;
}

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Instinct — la patte : signature de la marque (🐾). */
export function IconInstinct({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <ellipse cx="12" cy="15.5" rx="4.6" ry="4" />
      <ellipse cx="5.6" cy="10.4" rx="2.1" ry="2.5" />
      <ellipse cx="9.7" cy="6.4" rx="2.1" ry="2.6" />
      <ellipse cx="14.9" cy="6.4" rx="2.1" ry="2.6" />
      <ellipse cx="18.9" cy="10.4" rx="2.1" ry="2.5" />
    </svg>
  );
}

/** Identité — le Palais : radar à 5 axes (Racines/Horizons, Tanière/Nomade,
 *  Exigeant/Enthousiaste, Foule/Secret, Maquis/Table). */
export function IconIdentite({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <path d="M12 2.6 21 9.2l-3.4 10.6H6.4L3 9.2Z" />
      <path d="M12 7.4l4.7 3.4-1.8 5.5H9.1L7.3 10.8Z" opacity="0.55" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Communauté — la Meute : trois silhouettes, la data vient du groupe. */
export function IconCommunaute({ size = 32 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" {...base}>
      <circle cx="12" cy="7.2" r="3.1" />
      <path d="M6.2 20.2c0-3.2 2.6-5.3 5.8-5.3s5.8 2.1 5.8 5.3" />
      <path d="M5.4 11.2a2.4 2.4 0 1 0-.1-4.7" opacity="0.55" />
      <path d="M2.2 17.6c0-2 1.2-3.4 3.2-3.6" opacity="0.55" />
      <path d="M18.6 11.2a2.4 2.4 0 1 1 .1-4.7" opacity="0.55" />
      <path d="M21.8 17.6c0-2-1.2-3.4-3.2-3.6" opacity="0.55" />
    </svg>
  );
}
