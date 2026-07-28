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
 * Lit la ligne `spawt_staff` du compte connecté.
 *
 * La policy `spawt_staff_select_own` (migration 0001) autorise un membre de
 * l'équipe à lire SA ligne — et personne d'autre à lire quoi que ce soit. Un
 * compte ordinaire qui se connecterait ici obtiendrait donc zéro ligne, pas
 * une erreur : c'est le serveur qui tranche, pas une liste côté client.
 *
 * `is_active` est filtré côté SQL : désactiver un compte dans la console doit
 * refermer la porte, pas seulement retirer l'accès à la modération.
 */
export async function fetchStaffIdentity(): Promise<StaffIdentity | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await previewClient
    .from("spawt_staff")
    .select("id, display_name, role")
    .eq("is_active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as StaffIdentity;
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
