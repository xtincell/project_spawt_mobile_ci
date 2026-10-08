// Configuration de la vitrine — lecture centralisée des variables d'env Vite.
// Décision : aucun accès direct à import.meta.env ailleurs dans src/ (testable,
// et un seul endroit à auditer quand une variable change de nom).
//
// Seule l'édition publique de marque est lue à distance, sans secret ni cookie.
// Les autres contrats (quiz, stores, légal) restent propres à leur surface.

const env = import.meta.env;

/** Liens stores — undefined → badge « Bientôt sur » non cliquable. */
export const APPSTORE_URL = env.VITE_APPSTORE_URL || undefined;
export const PLAYSTORE_URL = env.VITE_PLAYSTORE_URL || undefined;

/** Quiz du Palais (site sœur, déjà en ligne). */
export const QUIZ_URL = env.VITE_QUIZ_URL || "https://quiz.spawt.online";

/** Compte Instagram de la marque. */
export const INSTAGRAM_URL = "https://instagram.com/spawt.ci";

/** Contact éditeur (légal, support). */
export const CONTACT_EMAIL = "spawt.ci@gmail.com";

/** Public brand edition only; never the private strategy export. */
export const PUBLIC_BRAND_URL = "https://powerupgraders.com/api/export/LFA-spawt?format=public-brand";
