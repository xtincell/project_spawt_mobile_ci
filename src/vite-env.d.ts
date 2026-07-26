/// <reference types="vite/client" />

// Typage des variables d'environnement Vite du portail (cf. .env.example).
interface ImportMetaEnv {
  /** URL du projet Supabase (ex. https://xxxx.supabase.co) */
  readonly VITE_SUPABASE_URL?: string;
  /** Clé anon (publishable) Supabase */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Lien App Store — badge « bientôt » si absent */
  readonly VITE_APPSTORE_URL?: string;
  /** Lien Google Play — badge « bientôt » si absent */
  readonly VITE_PLAYSTORE_URL?: string;
  /** URL du quiz archétype (défaut : https://quiz.spawt.online) */
  readonly VITE_QUIZ_URL?: string;
  /** "1" → mode démo paiement : simule le checkout sans backend */
  readonly VITE_PAYMENT_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
