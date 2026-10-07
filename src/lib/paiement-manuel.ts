// Portail — déclaration d'un versement hors passerelle (migration 0063).
//
// À Abidjan, l'essentiel de l'argent circule par Wave, Orange Money, MTN MoMo,
// Moov Money — souvent d'un compte à l'autre, sans agrégateur. CinetPay reste
// utile pour la carte, mais ce n'est plus la condition d'ouverture de la
// monétisation : le payeur verse, le déclare ici, l'équipe valide.
//
// Ce module ne fait qu'INSÉRER une déclaration. Il n'accorde rien : le droit
// s'ouvre côté serveur, à la validation d'un admin. C'est volontairement le
// chemin le plus bête possible — une table, une policy « insert own », et
// aucune logique de droit côté client.

import { supabase } from "./supabase";

export type MethodePaiement =
  | "wave"
  | "orange_money"
  | "mtn_momo"
  | "moov_money"
  | "especes"
  | "virement"
  | "autre";

export type PlanPayant = "gold_monthly" | "gold_annual" | "pro" | "b2b_gold";

export interface InstructionVersement {
  method: MethodePaiement;
  label: string;
  destinataire: string | null;
  instructions: string;
  sort_order: number;
}

/** Tarifs TTC affichés — le serveur facture depuis son propre catalogue. */
export const TARIF_TTC: Record<PlanPayant, number> = {
  gold_monthly: 2950,
  gold_annual: 29500,
  pro: 17700,
  b2b_gold: 76700,
};

export const LIBELLE_PLAN: Record<PlanPayant, string> = {
  gold_monthly: "Spawter Gold — 1 mois",
  gold_annual: "Spawter Gold — 12 mois",
  pro: "Spawt Pro — lieu, 1 mois",
  b2b_gold: "Spawt Gold — lieu, 1 mois",
};

/**
 * Moyens de versement réellement ouverts.
 *
 * Ils viennent de la base et non du bundle : un numéro Wave qui change ne doit
 * pas imposer un rebuild du portail. Un moyen dont les coordonnées ne sont pas
 * renseignées est marqué inactif côté serveur et n'arrive donc jamais ici —
 * afficher un moyen de paiement sans numéro valide ne produit que du support.
 */
export async function listerInstructions(): Promise<InstructionVersement[]> {
  const { data, error } = await supabase
    .from("payment_instructions")
    .select("method, label, destinataire, instructions, sort_order")
    .order("sort_order");
  if (error || !data) return [];
  return data as InstructionVersement[];
}

export interface DeclarationVersement {
  plan: PlanPayant;
  method: MethodePaiement;
  /** Montant réellement envoyé, en francs entiers. */
  montant: number;
  reference?: string;
  telephoneEmetteur?: string;
  note?: string;
}

export type ResultatDeclaration =
  | { ok: true; id: string }
  | { ok: false; message: string };

/**
 * Enregistre la déclaration pour le compte connecté.
 *
 * On n'envoie PAS le compte payeur : `requester_id` prend `auth.uid()` par
 * défaut côté serveur (migration 0064), et la policy `insert_own` vérifie que
 * ce défaut correspond à l'appelant. Déclarer un versement pour le compte d'un
 * tiers n'est donc pas une requête refusée — c'est une requête qu'on ne sait
 * pas formuler depuis ici.
 */
export async function declarerVersement(
  d: DeclarationVersement,
): Promise<ResultatDeclaration> {
  const estB2b = d.plan === "pro" || d.plan === "b2b_gold";
  const { data, error } = await supabase
    .from("payment_requests")
    .insert({
      customer_type: estB2b ? "b2b" : "b2c",
      plan: d.plan,
      method: d.method,
      amount_declare: Math.round(d.montant),
      reference: d.reference?.trim() || null,
      payer_phone: d.telephoneEmetteur?.trim() || null,
      note: d.note?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    // Session expirée : la policy refuse et PostgREST renvoie 42501. Le dire
    // clairement évite de proposer un « réessaie » qui ne marchera jamais.
    if (error.code === "42501") {
      return { ok: false, message: "Session expirée — reconnecte-toi et recommence." };
    }
    // Le quota (3 demandes en attente) est une contrainte serveur : on la
    // traduit, sinon le message brut de PostgreSQL arrive tel quel à l'écran.
    if (/quota/i.test(error.message)) {
      return {
        ok: false,
        message:
          "Tu as déjà 3 déclarations en attente. Attends qu'on les traite, ou annule-en une.",
      };
    }
    return { ok: false, message: "Impossible d'enregistrer la déclaration. Réessaie." };
  }
  return { ok: true, id: (data as { id: string }).id };
}

export interface DemandeEnCours {
  id: string;
  plan: PlanPayant;
  method: MethodePaiement;
  amount_declare: number;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decision_reason: string | null;
  created_at: string;
}

/** Les déclarations du compte connecté — la RLS ne rend que les siennes. */
export async function mesDeclarations(): Promise<DemandeEnCours[]> {
  const { data, error } = await supabase
    .from("payment_requests")
    .select("id, plan, method, amount_declare, status, decision_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data) return [];
  return data as DemandeEnCours[];
}

/** Annuler une déclaration en attente (erreur de plan, payé par carte depuis). */
export async function annulerDeclaration(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("payment_requests")
    .update({ status: "cancelled" })
    .eq("id", id);
  return !error;
}
