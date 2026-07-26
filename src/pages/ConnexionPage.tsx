// /connexion — login OTP par SMS, même flux que l'app mobile :
//   1. POST /functions/v1/otp-send {phone_e164}        (Bearer = clé anon)
//   2. POST /functions/v1/otp-verify {phone_e164, otp_code}
//      → {access_token, refresh_token} → supabase.auth.setSession(...)
// Gère : numéro ivoirien (+225, préfixe fixe), invalid_otp, rate limit 429,
// cooldown de renvoi 30 s, compte suspendu, redirection ?next=.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { sendOtp, verifyOtp, ApiError } from "../lib/api";
import { normalizeCivPhone, formatCivPhone } from "../lib/phone";
import { supabase } from "../lib/supabase";
import { isSupabaseConfigured } from "../lib/config";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";

const RESEND_COOLDOWN_S = 30;
const OTP_RE = /^\d{6}$/;

/** Messages FR par code d'erreur contractuel des Edge Functions. */
function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    switch (err.code) {
      case "invalid_otp":
        return "Code incorrect. Vérifie le SMS et réessaie.";
      case "rate_limited":
        return "Trop de tentatives. Souffle un peu et réessaie dans une heure.";
      case "no_pending_otp":
        return "Aucun code en attente pour ce numéro. Renvoie un code.";
      case "otp_already_used":
        return "Ce code a déjà servi. Renvoie un nouveau code.";
      case "invalid_phone":
        return "Ce numéro n'a pas l'air ivoirien. Format : +225 XX XX XX XX XX.";
      case "ACCOUNT_BANNED":
        return "Compte suspendu. Écris-nous si tu penses que c'est une erreur.";
      case "provider_timeout":
      case "provider_error":
        return "L'envoi de SMS patine. Réessaie dans un instant.";
      case "network_error":
        return "Pas de réseau. Vérifie ta connexion et réessaie.";
      default:
        return "Un pépin de notre côté. Réessaie dans un instant.";
    }
  }
  return "Un pépin de notre côté. Réessaie dans un instant.";
}

/** Ne suit que des chemins internes (anti open-redirect sur ?next=). */
function safeNext(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/compte";
}

export default function ConnexionPage() {
  usePageTitle("Connexion");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session } = useAuth();
  const next = safeNext(params.get("next"));

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [national, setNational] = useState("");
  const [phoneE164, setPhoneE164] = useState<string | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Déjà connecté → direction la suite (ex. checkout).
  useEffect(() => {
    if (session) navigate(next, { replace: true });
  }, [session, navigate, next]);

  useEffect(
    () => () => {
      if (cooldownRef.current !== null) clearInterval(cooldownRef.current);
    },
    [],
  );

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_S);
    if (cooldownRef.current !== null) clearInterval(cooldownRef.current);
    cooldownRef.current = setInterval(() => {
      setCooldown((s) => {
        if (s <= 1 && cooldownRef.current !== null) {
          clearInterval(cooldownRef.current);
          cooldownRef.current = null;
        }
        return Math.max(0, s - 1);
      });
    }, 1000);
  };

  const normalized = normalizeCivPhone(national);

  const submitPhone = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || !normalized) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await sendOtp(normalized);
      setPhoneE164(normalized);
      setStep("otp");
      setInfo(`Code envoyé au ${formatCivPhone(normalized)}.`);
      startCooldown();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (busy || cooldown > 0 || !phoneE164) return;
    setError(null);
    setBusy(true);
    try {
      await sendOtp(phoneE164);
      setInfo("Nouveau code envoyé.");
      startCooldown();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const submitOtp = async (e?: FormEvent) => {
    e?.preventDefault();
    if (busy || !phoneE164 || !OTP_RE.test(otp)) return;
    setError(null);
    setBusy(true);
    try {
      const result = await verifyOtp(phoneE164, otp);
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });
      if (sessionError) {
        setError("Session impossible à ouvrir. Réessaie.");
        return;
      }
      navigate(next, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="section">
      <div className="container container--narrow">
        <p className="section-kicker">Connexion</p>
        <h1>Le même numéro que dans l'app</h1>
        <p style={{ color: "var(--ink-soft)" }}>
          Pas de mot de passe chez SPAWT&nbsp;: ton numéro, un code par SMS, et
          c'est réglé.
        </p>

        {!isSupabaseConfigured && (
          <p className="notice" role="alert">
            Portail en mode démo&nbsp;: le backend n'est pas configuré
            (VITE_SUPABASE_URL manquant). La connexion ne fonctionnera pas.
          </p>
        )}

        {step === "phone" ? (
          <form onSubmit={submitPhone} aria-label="Saisie du numéro de téléphone">
            <div className="field">
              <label htmlFor="phone">Ton numéro ivoirien</label>
              <div className="input-phone">
                <span className="input-phone__prefix" aria-hidden="true">
                  +225
                </span>
                <input
                  id="phone"
                  className="input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder="07 08 09 10 11"
                  value={national}
                  onChange={(e) => setNational(e.target.value)}
                  aria-describedby="phone-hint"
                  autoFocus
                />
              </div>
              <span className="field__hint" id="phone-hint">
                10 chiffres après l'indicatif (Orange, MTN, Moov).
              </span>
            </div>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="btn btn--accent btn--block"
              type="submit"
              disabled={!normalized || busy}
            >
              {busy ? "Envoi du code…" : "Recevoir mon code"}
            </button>
          </form>
        ) : (
          <form onSubmit={submitOtp} aria-label="Saisie du code reçu par SMS">
            <div className="field">
              <label htmlFor="otp">Le code à 6 chiffres</label>
              <input
                id="otp"
                className="input input--otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
              {phoneE164 && (
                <span className="field__hint">
                  Envoyé au {formatCivPhone(phoneE164)} —{" "}
                  <button
                    type="button"
                    className="btn-link"
                    style={{
                      background: "none",
                      border: 0,
                      padding: 0,
                      color: "var(--accent)",
                      textDecoration: "underline",
                      cursor: cooldown > 0 ? "not-allowed" : "pointer",
                      font: "inherit",
                    }}
                    onClick={() => {
                      setStep("phone");
                      setOtp("");
                      setError(null);
                      setInfo(null);
                    }}
                  >
                    changer de numéro
                  </button>
                </span>
              )}
            </div>
            {info && (
              <p className="form-info" role="status">
                {info}
              </p>
            )}
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <button
              className="btn btn--accent btn--block"
              type="submit"
              disabled={!OTP_RE.test(otp) || busy}
            >
              {busy ? "Vérification…" : "Me connecter"}
            </button>
            <p style={{ marginTop: "var(--sp-base)", textAlign: "center" }}>
              <button
                type="button"
                onClick={resend}
                disabled={cooldown > 0 || busy}
                className="btn btn--ghost"
              >
                {cooldown > 0 ? `Renvoyer le code (${cooldown} s)` : "Renvoyer le code"}
              </button>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}
