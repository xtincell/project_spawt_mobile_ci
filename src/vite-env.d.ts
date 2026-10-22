/// <reference types="vite/client" />

// Typage des variables d'environnement Vite de la vitrine (cf. .env.example).
interface ImportMetaEnv {
  /** Lien App Store — badge « Bientôt sur » si absent */
  readonly VITE_APPSTORE_URL?: string;
  /** Lien Google Play — badge « Bientôt sur » si absent */
  readonly VITE_PLAYSTORE_URL?: string;
  /** URL du quiz du Palais (défaut : https://quiz.spawt.online) */
  readonly VITE_QUIZ_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
