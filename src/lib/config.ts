// Configuration du portail — lecture centralisée des variables d'env Vite.
// Décision : aucun accès direct à import.meta.env ailleurs dans src/ (testable,
// et un seul endroit à auditer quand une variable change de nom).

const env = import.meta.env;

/** URL du projet Supabase, sans slash final. */
export const SUPABASE_URL = (env.VITE_SUPABASE_URL ?? "").replace(/\/+$/, "");

/** Clé anon Supabase (publique par design — la sécurité est côté RLS). */
export const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? "";

/** Vrai si le backend Supabase est configuré (sinon : bandeau démo). */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

/** Liens stores — undefined → badge « bientôt » non cliquable. */
export const APPSTORE_URL = env.VITE_APPSTORE_URL || undefined;
export const PLAYSTORE_URL = env.VITE_PLAYSTORE_URL || undefined;

/** Quiz archétype (site sœur). */
export const QUIZ_URL = env.VITE_QUIZ_URL || "https://quiz.spawt.online";

/** Mode démo paiement : simule payment-checkout + retour succès sans backend. */
export const isPaymentMock = env.VITE_PAYMENT_MOCK === "1";

/** Deep link vers l'app mobile (bouton « Ouvrir SPAWT » post-paiement). */
export const APP_DEEP_LINK = "spawt://";

/** Contact éditeur (légal, support, B2B). */
export const CONTACT_EMAIL = "spawt.ci@gmail.com";
