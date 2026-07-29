// Portail — le rideau d'avant-lancement.
//
// Visiteur → l'écran « Bientôt ». Membre de l'équipe connecté → le portail
// réel. L'identité est celle de la console admin (`spawt_staff`), donc
// révocable au même endroit : désactiver un compte referme la porte.
//
// Pourquoi ce composant enveloppe TOUT le routeur et non la seule page
// d'accueil : sinon `/gold` resterait atteignable en tapant l'URL, et c'est
// précisément la page qu'on ne veut pas montrer (bouton d'achat sans encaissement).

import { useEffect, useState, type ReactNode } from "react";
import {
  fetchStaffIdentity,
  isPreviewGate,
  signInStaff,
  signOutStaff,
  type StaffIdentity,
} from "../lib/preview-gate";
import { QUIZ_URL } from "../lib/config";

export default function PreviewGate({ children }: { children: ReactNode }) {
  // Build public : le rideau n'existe pas, aucun code de porte n'est monté.
  if (!isPreviewGate) return <>{children}</>;
  return <GateInner>{children}</GateInner>;
}

function GateInner({ children }: { children: ReactNode }) {
  const [staff, setStaff] = useState<StaffIdentity | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetchStaffIdentity()
      .then((s) => {
        if (!cancelled) {
          setStaff(s);
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) setChecking(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Pendant la vérification on n'affiche NI le portail NI « Bientôt » : faire
  // clignoter la page publique une demi-seconde devant un admin, ou l'inverse
  // devant un visiteur, serait pire que d'attendre.
  if (checking) {
    return (
      <div className="gate">
        <p className="gate__wait">Un instant…</p>
      </div>
    );
  }

  if (staff) {
    return (
      <>
        <div className="gate-banner" role="status">
          Aperçu équipe — {staff.display_name} ({staff.role}). Ce site n'est pas
          public : les visiteurs voient la page « Bientôt ».{" "}
          <button
            type="button"
            className="gate-banner__out"
            onClick={() => {
              void signOutStaff().then(() => setStaff(null));
            }}
          >
            Quitter l'aperçu
          </button>
        </div>
        {children}
      </>
    );
  }

  return <BientotScreen onOpen={setStaff} />;
}

/** L'écran des visiteurs — même promesse que spawt.online, sans le décompte
 *  (qui vit sur la page statique et n'a pas à être dupliqué ici : deux
 *  compteurs qui divergent d'une seconde, c'est un bug de plus à expliquer). */
function BientotScreen({ onOpen }: { onOpen: (s: StaffIdentity) => void }) {
  const [showForm, setShowForm] = useState(false);

  return (
    <main className="gate">
      <div className="gate__inner">
        <p className="gate__kicker">Abidjan · bientôt</p>
        <p className="gate__cat" aria-hidden="true">
          🐈‍⬛
        </p>
        <h1 className="gate__title">SPAWT</h1>
        <p className="gate__promise">Ta carte de goût arrive.</p>
        <p className="gate__sub">Ne plus jamais regretter un lieu à Abidjan.</p>

        <a className="btn btn--ghost gate__quiz" href={QUIZ_URL}>
          Quel spawter es-tu&nbsp;? Fais le test →
        </a>

        {showForm ? (
          <StaffForm onOpen={onOpen} onCancel={() => setShowForm(false)} />
        ) : (
          <button
            type="button"
            className="gate__staff"
            onClick={() => setShowForm(true)}
          >
            Accès équipe
          </button>
        )}
      </div>
    </main>
  );
}

function StaffForm({
  onOpen,
  onCancel,
}: {
  onOpen: (s: StaffIdentity) => void;
  onCancel: () => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await signInStaff(email.trim(), password);
      if (res.ok) onOpen(res.staff);
      else setError(res.message);
    } catch {
      setError("Backend injoignable.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="gate__form" onSubmit={onSubmit}>
      <p className="gate__form-title">Accès équipe</p>
      <label className="gate__label">
        E-mail
        <input
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="gate__label">
        Mot de passe
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error ? (
        <p className="gate__error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="gate__form-actions">
        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Vérification…" : "Ouvrir l'aperçu"}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          onClick={onCancel}
          disabled={busy}
        >
          Annuler
        </button>
      </div>
      <p className="gate__hint">Mêmes identifiants que la console admin.</p>
    </form>
  );
}
