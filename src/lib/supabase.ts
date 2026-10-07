// Client Supabase du portail — session persistée en localStorage.
// Décisions :
//  - un seul client anon partagé ; l'access_token du spawter est injecté par
//    supabase.auth.setSession(...) après le flux OTP (cf. pages/ConnexionPage).
//  - detectSessionInUrl désactivé : notre auth passe par les Edge Functions
//    otp-send / otp-verify, jamais par des liens magiques dans l'URL.
//  - si le backend n'est pas configuré (dev sans .env), on instancie quand
//    même un client sur une URL placeholder pour que l'app démarre — les
//    écrans concernés affichent un bandeau « backend non configuré ».
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config";

const PLACEHOLDER_URL = "https://non-configure.supabase.co";
const PLACEHOLDER_KEY = "cle-anon-non-configuree";

export const supabase = createClient(
  isSupabaseConfigured ? SUPABASE_URL : PLACEHOLDER_URL,
  isSupabaseConfigured ? SUPABASE_ANON_KEY : PLACEHOLDER_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: "spawt-portail-auth",
    },
  },
);
