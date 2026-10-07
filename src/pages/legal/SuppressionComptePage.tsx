// /legal/suppression-compte — Demande de suppression de compte, page PUBLIQUE
// (accessible sans connexion) exigée par le formulaire Data Safety de Google
// Play. Deux chemins : en 1 tap dans l'app (Réglages → Supprimer mon compte,
// migration 0029 côté backend), ou par email pour ceux qui n'ont plus l'app.

import { Link } from "react-router";
import { CONTACT_EMAIL } from "../../lib/config";
import { usePageTitle } from "../../lib/use-page-title";

const MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
  "Suppression de compte SPAWT",
)}&body=${encodeURIComponent(
  "Bonjour,\n\nJe demande la suppression de mon compte SPAWT.\nNuméro de téléphone du compte : +225 \n\nMerci.",
)}`;

export default function SuppressionComptePage() {
  usePageTitle("Supprimer mon compte");
  return (
    <section className="section legal">
      <div className="container container--narrow">
        <h1>Supprimer ton compte SPAWT</h1>
        <p>
          Ton compte t'appartient — le supprimer aussi. Cette page est
          accessible sans connexion, comme l'exige Google Play, et s'applique à
          l'app SPAWT comme au portail spawt.online.
        </p>

        <h2>1. Le plus simple&nbsp;: dans l'app, en un tap</h2>
        <p>
          Ouvre SPAWT puis&nbsp;: <strong>Profil → Réglages → Supprimer mon
          compte</strong>. La suppression est traitée directement par nos
          serveurs&nbsp;: compte, Palais, spawts et Coups de Cœur sont
          supprimés, tes avis publics sont anonymisés (ils ne portent plus ton
          nom ni aucun identifiant).
        </p>

        <h2>2. Tu n'as plus l'app&nbsp;? Par email</h2>
        <p>
          Envoie un email à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> avec l'objet
          «&nbsp;Suppression de compte SPAWT&nbsp;» et le{" "}
          <strong>numéro de téléphone du compte</strong> (indispensable pour
          t'identifier — on peut te demander une confirmation par SMS sur ce
          numéro avant d'agir).
        </p>
        <p>
          <a className="btn btn--accent" href={MAILTO}>
            Demander la suppression par email
          </a>
        </p>

        <h2>3. Délais et ce qui est supprimé</h2>
        <ul>
          <li>
            Ta demande est traitée sous <strong>30 jours</strong> au maximum.
          </li>
          <li>
            Sont supprimés&nbsp;: ton compte, ton numéro, ton Palais, ton
            historique de spawts et tes favoris.
          </li>
          <li>
            Sont <strong>anonymisés</strong> (et non supprimés)&nbsp;: tes avis
            publiés, car ils font partie de la mémoire collective de la Meute —
            plus rien ne permet de remonter à toi.
          </li>
          <li>
            Sont conservés le temps légal&nbsp;: les factures liées à un
            abonnement Gold (obligations comptables, cf.{" "}
            <Link to="/legal/cgv">CGV</Link>).
          </li>
        </ul>

        <h2>4. Le cadre légal</h2>
        <p>
          Cette procédure met en œuvre ton droit de suppression prévu par la{" "}
          <strong>loi ivoirienne n°&nbsp;2013-450 du 19 juin 2013</strong>{" "}
          relative à la protection des données à caractère personnel. Pour le
          détail des traitements et de tes autres droits (accès, rectification,
          opposition), voir la{" "}
          <Link to="/legal/confidentialite">politique de confidentialité</Link>.
          En cas de difficulté, tu peux saisir l'ARTCI.
        </p>
      </div>
    </section>
  );
}
