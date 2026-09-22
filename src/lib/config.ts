// Configuration de la vitrine — lecture centralisée des variables d'env Vite.
// Décision : aucun accès direct à import.meta.env ailleurs dans src/ (testable,
// et un seul endroit à auditer quand une variable change de nom).
//
// La vitrine ne parle à AUCUN backend : ni Supabase, ni Edge Function, ni
// passerelle de paiement. C'est ce qui permet à la CSP de poser
// connect-src 'self' — rien à autoriser, donc rien à oublier de fermer.

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
