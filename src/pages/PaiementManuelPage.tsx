// Portail — « J'ai payé par Wave / Orange Money / MoMo » (migration 0063).
//
// Chemin de paiement principal en Côte d'Ivoire : on verse d'un compte à
// l'autre, puis on le déclare. L'équipe rapproche avec le relevé et valide ;
// le droit s'ouvre à ce moment-là, pas avant.
//
// Ce que la page doit dire honnêtement : que ce n'est PAS immédiat. Laisser
// croire à une activation instantanée, c'est fabriquer une réclamation par
// paiement.

import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useAuth } from "../providers/AuthProvider";
import { usePageTitle } from "../lib/use-page-title";
import {
  LIBELLE_PLAN,
  TARIF_TTC,
  annulerDeclaration,
  declarerVersement,
  listerInstructions,
  mesDeclarations,
  type DemandeEnCours,
  type InstructionVersement,
  type MethodePaiement,
  type PlanPayant,
} from "../lib/paiement-manuel";

const STATUT_LABEL: Record<DemandeEnCours["status"], string> = {
  pending: "En attente de validation",
  approved: "Validée — ton accès est ouvert",
  rejected: "Refusée",
  cancelled: "Annulée",
};

export default function PaiementManuelPage() {
  usePageTitle("Payer par Wave, Orange Money ou MoMo");
  const { session } = useAuth();

  const [instructions, setInstructions] = useState<InstructionVersement[]>([]);
  const [chargement, setChargement] = useState(true);
  const [mesDemandes, setMesDemandes] = useState<DemandeEnCours[]>([]);

  const [plan, setPlan] = useState<PlanPayant>("gold_monthly");
  const [methode, setMethode] = useState<MethodePaiement | "">("");
  const [montant, setMontant] = useState<string>("");
  const [reference, setReference] = useState("");
  const [telephone, setTelephone] = useState("");
  const [note, setNote] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; texte: string } | null>(null);

  useEffect(() => {
    let annule = false;
    void (async () => {
      const [ins, dem] = await Promise.all([
        listerInstructions(),
        session ? mesDeclarations() : Promise.resolve([]),
      ]);
      if (annule) return;
      setInstructions(ins);
      setMesDemandes(dem);
      // Le montant proposé est le tarif : le payeur n'a pas à le calculer, et
      // un montant pré-rempli juste réduit les sous-paiements par erreur.
      setMontant(String(TARIF_TTC[plan]));
      setChargement(false);
    })();
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  function changerPlan(p: PlanPayant) {
    setPlan(p);
    setMontant(String(TARIF_TTC[p]));
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (envoi || !methode) return;
    setEnvoi(true);
    setMessage(null);
    const res = await declarerVersement({
      plan,
      method: methode,
      montant: Number(montant),
      reference,
      telephoneEmetteur: telephone,
      note,
    });
    setEnvoi(false);
    if (!res.ok) {
      setMessage({ ok: false, texte: res.message });
      return;
    }
    setMessage({
      ok: true,
      texte:
        "C'est noté. On vérifie le versement et on ouvre ton accès — tu peux fermer cette page.",
    });
    setReference("");
    setNote("");
    setMesDemandes(await mesDeclarations());
  }

  if (!session) {
    return (
      <section className="section">
        <div className="container">
          <h1>Payer autrement</h1>
          <p>Connecte-toi d'abord, pour qu'on sache à quel compte rattacher le versement.</p>
          <Link className="btn" to={`/connexion?next=${encodeURIComponent("/gold/paiement-manuel")}`}>
            Me connecter
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="section">
      <div className="container" style={{ maxWidth: "44rem" }}>
        <h1>Payer par Wave, Orange Money ou MoMo</h1>
        <p>
          Tu envoies le montant depuis ton téléphone, tu le déclares ici, et on
          ouvre ton accès dès qu'on a vu le versement arriver. Ce n'est pas
          instantané — compte quelques heures en journée.
        </p>

        {chargement ? <p>Chargement…</p> : null}

        {!chargement && instructions.length === 0 ? (
          <p className="card" style={{ padding: 16 }}>
            Les coordonnées de versement ne sont pas encore publiées. En
            attendant, écris-nous et on te guide — ou passe par la carte
            bancaire depuis la <Link to="/gold">page Gold</Link>.
          </p>
        ) : null}

        {instructions.length > 0 ? (
          <>
            <h2>1. Envoie le montant</h2>
            <ul>
              {instructions.map((i) => (
                <li key={i.method} style={{ marginBottom: 10 }}>
                  <strong>{i.label}</strong>
                  {i.destinataire ? ` — ${i.destinataire}` : ""}
                  <br />
                  <span style={{ color: "var(--ink-mute)" }}>{i.instructions}</span>
                </li>
              ))}
            </ul>

            <h2>2. Déclare-le</h2>
            <form onSubmit={envoyer} style={{ display: "grid", gap: 14 }}>
              <label>
                Ce que tu prends
                <select value={plan} onChange={(e) => changerPlan(e.target.value as PlanPayant)}>
                  {(Object.keys(TARIF_TTC) as PlanPayant[]).map((p) => (
                    <option key={p} value={p}>
                      {LIBELLE_PLAN[p]} — {TARIF_TTC[p]} F TTC
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Comment tu as payé
                <select
                  required
                  value={methode}
                  onChange={(e) => setMethode(e.target.value as MethodePaiement)}
                >
                  <option value="">Choisis…</option>
                  {instructions.map((i) => (
                    <option key={i.method} value={i.method}>
                      {i.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Montant envoyé (F CFA)
                <input
                  type="number"
                  required
                  min={1}
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                />
              </label>

              <label>
                Référence de la transaction
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="l'ID que l'opérateur t'a envoyé par SMS"
                />
              </label>

              <label>
                Numéro depuis lequel tu as payé
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  placeholder="+225…"
                />
              </label>

              <p style={{ color: "var(--ink-mute)", marginTop: -6 }}>
                La référence et le numéro nous servent à retrouver ton versement.
                Sans eux, on peut passer à côté et te faire attendre pour rien.
              </p>

              <label>
                Un mot pour nous (facultatif)
                <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>

              {message ? (
                <p
                  role={message.ok ? "status" : "alert"}
                  className="card"
                  style={{ padding: 12, borderLeft: `4px solid var(--${message.ok ? "accent" : "danger"})` }}
                >
                  {message.texte}
                </p>
              ) : null}

              <button className="btn btn--gold" type="submit" disabled={envoi || !methode}>
                {envoi ? "Envoi…" : "J'ai payé, prévenez l'équipe"}
              </button>
            </form>
          </>
        ) : null}

        {mesDemandes.length > 0 ? (
          <>
            <h2>Tes déclarations</h2>
            <ul>
              {mesDemandes.map((d) => (
                <li key={d.id} style={{ marginBottom: 8 }}>
                  {new Date(d.created_at).toLocaleDateString("fr-FR")} —{" "}
                  {LIBELLE_PLAN[d.plan]} · {d.amount_declare} F —{" "}
                  <strong>{STATUT_LABEL[d.status]}</strong>
                  {d.decision_reason ? ` (${d.decision_reason})` : ""}
                  {d.status === "pending" ? (
                    <>
                      {" "}
                      <button
                        type="button"
                        className="btn btn--ghost"
                        onClick={() => {
                          void annulerDeclaration(d.id).then(async (ok) => {
                            if (ok) setMesDemandes(await mesDeclarations());
                          });
                        }}
                      >
                        Annuler
                      </button>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </section>
  );
}
