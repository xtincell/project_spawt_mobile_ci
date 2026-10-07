// Programme ambassadeur — /ambassadeurs.
// Branché sur la table `ambassadors` de la migration 0044 (repo app) :
//   ambassadors(spawter_id PK, palier 1|2|3, since, notes) — RLS own
//   (ambassadors_select_own) : le token du spawter connecté ne lit que SA
//   ligne. L'inscription est une décision humaine (staff/service_role via
//   compute_ambassador_palier) : le portail LIT, il n'inscrit jamais.
//
// Conventions du portail (identiques à b2b-data.ts / invoices.ts) :
//  - fetch natif + fetchImpl injectable (tests via src/test/fetch-stub.ts),
//    pas de supabase.from() — le client supabase-js ne sert qu'à l'auth.
//  - dégradation propre si table absente (HTTP 404 ou code PG 42P01) : le
//    portail peut être déployé AVANT la base migrée. Ici, « table absente »
//    et « aucune ligne » se confondent volontairement : dans les deux cas le
//    spawter n'est pas (encore) ambassadeur et l'UI affiche « le palier est
//    attribué par l'équipe » + le CTA candidature.

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

type FetchImpl = typeof fetch;

// ── Les trois paliers (contenu de référence, affiché par la page) ──

export interface PalierInfo {
  palier: 1 | 2 | 3;
  nom: string;
  /** Rétribution phare, affichée en tête de carte (« Gold offert », fourchette F). */
  phare: string;
  /** Suffixe de la rétribution phare (« /mois ») — null si sans objet. */
  pharePeriode: string | null;
  /** Ce qu'il faut apporter pour y prétendre. */
  criteres: string[];
  /** Ce que SPAWT met sur la table, en plus de la rétribution phare. */
  avantages: string[];
}

// Espaces insécables ( ) dans les montants : mêmes conventions
// typographiques que les pages Gold et Pro.
/** Source unique du contenu paliers — cartes de la page + badge « Ton palier ». */
export const PALIERS: PalierInfo[] = [
  {
    palier: 1,
    nom: "Allié Content",
    phare: "Gold offert",
    pharePeriode: null,
    criteres: ["10+ spawts au compteur", "2 000+ followers sur tes réseaux"],
    avantages: [
      "Spawter Gold offert : tout Abidjan débloqué",
      "Visibilité éditoriale : tes trouvailles mises en avant par SPAWT",
    ],
  },
  {
    palier: 2,
    nom: "Ambassadeur Actif",
    phare: "50 000 à 100 000 F",
    pharePeriode: "/mois",
    criteres: [
      "Stade Détective atteint dans l'app",
      "5 000+ followers sur tes réseaux",
      "2 à 4 contenus par mois avec la Meute",
    ],
    avantages: ["Tout ce que reçoit l'Allié Content, en plus de ta rétribution"],
  },
  {
    palier: 3,
    nom: "Guide Ambassadeur",
    phare: "150 000 à 250 000 F",
    pharePeriode: "/mois",
    criteres: ["Stade Djidji atteint dans l'app", "10 000+ followers sur tes réseaux"],
    avantages: [
      "Co-créateur : tu façonnes la ligne éditoriale avec l'équipe",
      "Food tours SPAWT menés avec la Meute",
    ],
  },
];

/** Nom d'affichage d'un palier (null si la valeur sort du contrat 1-3). */
export function palierNom(palier: number): string | null {
  return PALIERS.find((p) => p.palier === palier)?.nom ?? null;
}

// ── Statut du spawter connecté ────────────────────────────────────

/** Ligne `ambassadors` telle que la RLS own la rend (au plus une). */
export interface AmbassadorRow {
  palier: number;
  since: string;
}

export type AmbassadorStatusResult =
  /** Le spawter est ambassadeur : palier + date d'entrée au programme. */
  | { status: "ambassador"; palier: number; since: string | null }
  /** Pas de ligne (ou table pas encore migrée) : le palier est attribué
   *  par l'équipe — l'UI propose la candidature mailto. */
  | { status: "none" }
  | { status: "session_expired" }
  | { status: "error" };

/** Une réponse « relation absente » = la table n'est pas encore déployée. */
async function isMissingRelation(resp: Response): Promise<boolean> {
  if (resp.status === 404) return true;
  try {
    const body = (await resp.clone().json()) as { code?: string };
    return body?.code === "42P01"; // PostgreSQL : undefined_table
  } catch {
    return false;
  }
}

/**
 * Statut ambassadeur du spawter connecté.
 * GET /rest/v1/ambassadors?select=palier,since&limit=1  (RLS own → 0 ou 1 ligne)
 * Table absente (404 / 42P01) → "none" : même parcours que « pas encore
 * ambassadeur », le portail peut vivre avant la migration 0044.
 */
export async function fetchAmbassadorStatus(
  accessToken: string,
  fetchImpl: FetchImpl = fetch,
): Promise<AmbassadorStatusResult> {
  let resp: Response;
  try {
    resp = await fetchImpl(`${SUPABASE_URL}/rest/v1/ambassadors?select=palier,since&limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        authorization: `Bearer ${accessToken}`,
        accept: "application/json",
      },
    });
  } catch {
    return { status: "error" };
  }
  if (resp.status === 401) return { status: "session_expired" };
  if (!resp.ok) {
    return (await isMissingRelation(resp)) ? { status: "none" } : { status: "error" };
  }
  const rows = (await resp.json()) as unknown;
  if (!Array.isArray(rows) || rows.length === 0) return { status: "none" };
  const row = rows[0] as Partial<AmbassadorRow>;
  if (typeof row?.palier !== "number" || palierNom(row.palier) === null) {
    // Ligne hors contrat (palier inconnu) : on ne devine pas, on dégrade.
    return { status: "error" };
  }
  return {
    status: "ambassador",
    palier: row.palier,
    since: typeof row.since === "string" ? row.since : null,
  };
}
