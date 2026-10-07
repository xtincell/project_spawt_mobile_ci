// /legal/cgv — Conditions Générales de Vente (abonnements B2C Gold + offres
// B2B lieux). Squelette complet : TVA 18 %, rétractation 7 jours, modalités
// Mobile Money. Points d'engagement marqués [À VALIDER PAR JURISTE].

import { Link } from "react-router";
import { CONTACT_EMAIL } from "../../lib/config";
import { usePageTitle } from "../../lib/use-page-title";

const MAJ = "26 juillet 2026";

export default function CgvPage() {
  usePageTitle("Conditions générales de vente");
  return (
    <section className="section legal">
      <div className="container container--narrow">
        <h1>Conditions générales de vente</h1>
        <p>
          Dernière mise à jour&nbsp;: {MAJ}. Les présentes CGV régissent les
          abonnements payants souscrits sur spawt.online auprès de{" "}
          <strong>SPAWT / UPGRADERS</strong>{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: dénomination sociale, RCCM,
          n°&nbsp;de compte contribuable]</mark>, contact&nbsp;:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>

        <h2>1. Les offres</h2>
        <h3 style={{ marginTop: "var(--sp-lg)" }}>Spawter Gold (particuliers)</h3>
        <ul>
          <li>
            Mensuel&nbsp;: <strong>2&nbsp;950&nbsp;F&nbsp;CFA TTC / mois</strong>{" "}
            (2&nbsp;500&nbsp;F CFA HT + TVA 18&nbsp;%).
          </li>
          <li>
            Annuel&nbsp;: <strong>29&nbsp;500&nbsp;F&nbsp;CFA TTC / an</strong>{" "}
            (25&nbsp;000&nbsp;F CFA HT + TVA 18&nbsp;%) — soit 12 mois au prix
            de 10.
          </li>
        </ul>
        <h3 style={{ marginTop: "var(--sp-lg)" }}>Offres lieux (professionnels)</h3>
        <ul>
          <li>Spawt Libre&nbsp;: 0&nbsp;F.</li>
          <li>Spawt Pro&nbsp;: 15&nbsp;000&nbsp;F CFA HT / mois + TVA 18&nbsp;%.</li>
          <li>Spawt Gold (lieux)&nbsp;: 65&nbsp;000&nbsp;F CFA HT / mois + TVA 18&nbsp;%.</li>
        </ul>
        <p>
          Les prix B2C sont affichés TTC, les prix professionnels HT. Toute
          évolution tarifaire est annoncée au moins 30 jours avant et ne
          s'applique jamais à une période déjà payée.
        </p>

        <h2>2. Souscription et paiement</h2>
        <p>
          L'abonnement se souscrit exclusivement sur spawt.online (jamais dans
          l'application mobile), après connexion avec le numéro de téléphone du
          compte. Le paiement s'effectue par Mobile Money (Orange Money, Wave,
          MTN MoMo) via notre prestataire CinetPay. L'abonnement est actif dès
          confirmation du paiement.
        </p>
        <p>
          <strong>Pas de prélèvement automatique&nbsp;:</strong> le Mobile
          Money ne se débite pas tout seul. Avant chaque échéance, SPAWT envoie
          un rappel à J-3 puis le jour J. Après l'échéance, l'accès Gold est
          maintenu pendant une <strong>période de grâce de 7 jours</strong> pour
          laisser le temps de renouveler. Sans renouvellement à l'issue de la
          grâce, le compte repasse en formule gratuite — sans perte de données.
        </p>

        <h2>3. Droit de rétractation</h2>
        <p>
          Tu disposes d'un délai de <strong>7 jours</strong> à compter de la
          souscription pour te rétracter et demander le remboursement intégral,
          par simple email à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: régime de rétractation applicable
          aux services numériques en droit ivoirien de la consommation
          (ordonnance 2012-293 et textes subséquents), et sort de la
          rétractation si le service a été pleinement consommé]</mark>. Le
          remboursement s'effectue sur le moyen de paiement d'origine sous{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: délai, p. ex. 14 jours]</mark>.
        </p>

        <h2>4. Facturation</h2>
        <p>
          Chaque paiement donne lieu à une facture (numéro, montant TTC, TVA
          18&nbsp;% détaillée) disponible dans{" "}
          <Link to="/compte">l'espace compte</Link>. Pour les offres
          professionnelles, la facture mentionne les références fiscales de
          l'établissement <mark>[À VALIDER PAR JURISTE&nbsp;: mentions
          obligatoires DGI]</mark>.
        </p>

        <h2>5. Résiliation</h2>
        <ul>
          <li>
            <strong>Mensuel&nbsp;:</strong> sans engagement — il suffit de ne
            pas renouveler. L'accès reste actif jusqu'à la fin de la période
            payée.
          </li>
          <li>
            <strong>Annuel&nbsp;:</strong> hors rétractation de 7 jours, la
            période payée n'est pas remboursable au prorata{" "}
            <mark>[À VALIDER PAR JURISTE&nbsp;: licéité du non-remboursement
            prorata]</mark>.
          </li>
          <li>
            <strong>Par SPAWT&nbsp;:</strong> en cas de fraude au paiement ou de
            violation des <Link to="/legal/cgu">CGU</Link>, l'abonnement peut
            être suspendu sans remboursement{" "}
            <mark>[À VALIDER PAR JURISTE]</mark>.
          </li>
        </ul>

        <h2>6. Disponibilité du service payant</h2>
        <p>
          En cas d'indisponibilité majeure et prolongée du service imputable à
          SPAWT (hors maintenance annoncée et force majeure), la période
          d'abonnement est prolongée d'autant{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: seuil de déclenchement]</mark>.
        </p>

        <h2>7. Réclamations et litiges</h2>
        <p>
          Toute réclamation s'adresse d'abord à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> — on répond
          vite et sans langue de bois. À défaut d'accord amiable, le litige
          relève du droit ivoirien et des juridictions compétentes d'Abidjan{" "}
          <mark>[À VALIDER PAR JURISTE]</mark>.
        </p>
      </div>
    </section>
  );
}
