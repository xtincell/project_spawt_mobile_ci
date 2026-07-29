// Normalisation des numéros ivoiriens — reproduit la logique de l'app mobile
// (app/app/(onboarding)/phone.tsx, P7) : numérotation CIV post-2022 (ARTCI).
//   Mobiles (10 chiffres) : Orange 07/08/09 · MTN 04/05/06 · Moov 01/02/03
//     → préfixe national `0[1-9]`.
//   Fixes (9 chiffres) : `2XXXXXXXX` (Abidjan / autres zones).
// L'Edge Function valide côté serveur avec ^\+[1-9]\d{8,14}$ (migration 0009) ;
// ici on est plus strict (CIV only) car le portail cible Abidjan.

/** Regex canonique CIV — identique à CIV_MOBILE_RE de l'app mobile. */
export const CIV_PHONE_RE = /^\+225(0[1-9]\d{8}|2\d{8})$/;

/**
 * Normalise une saisie libre en E.164 ivoirien (+225XXXXXXXXXX).
 * Accepte : espaces/points/tirets, préfixes `+225` / `00225` / `225`,
 * ou le numéro national nu (`07 08 09 10 11`).
 * Retourne null si le résultat n'est pas un numéro CIV valide.
 */
export function normalizeCivPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s.\-()]/g, "");
  if (cleaned.length === 0) return null;

  let digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned;
  if (!/^\d+$/.test(digits)) return null;

  if (digits.startsWith("00225")) {
    digits = digits.slice(5);
  } else if (digits.startsWith("225") && digits.length >= 12) {
    // `225...` déjà préfixé indicatif (12+ chiffres) — un fixe local
    // `225XXXXXX` (9 chiffres) reste interprété comme numéro national.
    digits = digits.slice(3);
  }

  const e164 = `+225${digits}`;
  return CIV_PHONE_RE.test(e164) ? e164 : null;
}

/** Format d'affichage lisible : +225 07 08 09 10 11. */
export function formatCivPhone(e164: string): string {
  const m = e164.match(/^\+225(\d{9,10})$/);
  if (!m) return e164;
  return `+225 ${m[1].replace(/(\d{2})(?=\d)/g, "$1 ")}`;
}

/** Masquage analytics/affichage : garde tête et queue (cf. app mobile). */
export function maskPhone(e164: string): string {
  if (e164.length < 6) return "MASQUE";
  return `${e164.slice(0, 4)} ${"X".repeat(e164.length - 6)} ${e164.slice(-2)}`;
}
