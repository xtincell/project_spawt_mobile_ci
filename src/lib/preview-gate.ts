// Portail — porte d'accès avant lancement.
//
// Le problème : `spawt.online` sert aujourd'hui une page « Bientôt » propre,
// avec un compte à rebours. Le portail réel (vitrine, Gold, Pro, ambassadeurs)
// est prêt mais ne doit PAS être montré au public tant que CinetPay n'encaisse
// pas — un bouton d'achat qui ne mène nulle part coûte plus cher que l'attente.
// L'équipe, elle, doit pouvoir le regarder en vrai, sur le vrai backend.
//
// La porte : quand `VITE_PREVIEW_GATE=true`, le portail affiche l'écran
// « Bientôt » à tout le monde, SAUF à un membre de l'équipe connecté. Pas de
// mot de passe partagé, pas de lien secret qui finit dans une conversation :
// l'identité est celle de la console admin (`spawt_staff`), la même que pour
// la modération, révocable au même endroit.
//
// ── Ce que cette porte est, et ce qu'elle n'est pas ─────────────────────────
// C'est un rideau, pas un coffre. Le bundle JavaScript du portail reste public
// (c'est le cas de tout site statique) : un visiteur curieux peut lire les
// routes dans le code. Ce qu'il ne peut pas faire, c'est obtenir les DONNÉES —
// elles restent derrière la RLS et les Edge Functions. Le rideau protège
// l'image de marque avant lancement, pas des secrets ; le jour du lancement,
// on retire la variable et il n'y a rien d'autre à défaire.
//
// Choix de mise en œuvre : un client Supabase DÉDIÉ, avec son propre
// `storageKey`. La session d'équipe ne doit pas se confondre avec celle d'un
// Spawter connecté au portail — sinon un admin qui ouvre la porte se retrouve
// « connecté » comme abonné sur /compte, avec un compte qui n'existe pas.

import { createClient } from "@supabase/supabase-js";
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
} from "./config";

/** Rideau actif ? Opt-in explicite : un build sans la variable est un build
 *  public normal. On ne veut surtout pas d'un rideau qui s'active tout seul
 *  le jour du lancement parce qu'une variable a été oubliée quelque part. */
export const isPreviewGate = import.meta.env.VITE_PREVIEW_GATE === "true";

const PLACEHOLDER_URL = "https://non-configure.supabase.co";
const PLACEHOLDER_KEY = "cle-anon-non-configuree";

/** Client dédié à la porte — session d'équipe isolée de la session Spawter. */
export const previewClient = createClient(
  isSupabaseConfigured ? SUPABASE_URL : PLACEHOLDER_URL,
  isSupabaseConfigured ? SUPABASE_ANON_KEY : PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "spawt-portail-apercu",
    },
  },
);

export interface StaffIdentity {
  id: string;
  display_name: string;
  role: "admin" | "moderator" | "operator";
}

/**
 * Qui est l'appelant, côté équipe ? RPC `current_staff()` (migration 0062) :
 * sa ligne `spawt_staff` si elle existe et que le compte est actif, aucune
 * ligne sinon.
 *
 * ⚠️ NE PAS revenir à un `select` direct sur `spawt_staff`. C'est ce qu'on
 * faisait, et ça cassait la porte pour les admins : `spawt_staff_select_admin`
 * (migration 0001) autorise un admin à lire TOUTE l'équipe, donc la requête
 * renvoyait trois lignes et `maybeSingle()` sortait en erreur. Un moderator
 * passait, un admin non — seul le cas nominal était touché. La RPC pose la
 * question que le serveur sait trancher seul, sans paramètre : impossible d'y
 * réintroduire ce piège, ni de s'en servir pour sonder un autre compte.
 *
 * Trouvé en recette navigateur contre le vrai backend. Les tests, qui simulent
 * le client, ne pouvaient pas le voir.
 */
export async function fetchStaffIdentity(): Promise<StaffIdentity | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await previewClient.rpc("current_staff");
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as StaffIdentity;
}

/** Connexion équipe (mêmes identifiants que la console admin). */
export async function signInStaff(
  email: string,
  password: string,
): Promise<
  { ok: true; staff: StaffIdentity } | { ok: false; message: string }
> {
  const { error } = await previewClient.auth.signInWithPassword({
    email,
    password,
  });
  if (error) {
    // On ne distingue pas « e-mail inconnu » de « mot de passe faux » : ce
    // serait dire à un inconnu quelles adresses appartiennent à l'équipe.
    return { ok: false, message: "Identifiants refusés." };
  }
  const staff = await fetchStaffIdentity();
  if (!staff) {
    // Compte valide mais pas dans l'équipe : on referme la session, sinon on
    // laisserait traîner un jeton pour rien dans le navigateur d'un visiteur.
    await previewClient.auth.signOut();
    return {
      ok: false,
      message: "Ce compte n'appartient pas à l'équipe SPAWT.",
    };
  }
  return { ok: true, staff };
}

export async function signOutStaff(): Promise<void> {
  await previewClient.auth.signOut();
}
