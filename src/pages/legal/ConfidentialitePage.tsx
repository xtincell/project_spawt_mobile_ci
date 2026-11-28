// /legal/confidentialite — Politique de confidentialité.
// Squelette juridique complet (déclaré aux stores) : Loi ivoirienne 2013-450,
// ARTCI, consentement géolocalisation, droits d'accès/rectification/suppression.
// Les points d'engagement portent le marqueur [À VALIDER PAR JURISTE].

import { Link } from "react-router";
import { CONTACT_EMAIL } from "../../lib/config";
import { usePageTitle } from "../../lib/use-page-title";

const MAJ = "26 juillet 2026";

export default function ConfidentialitePage() {
  usePageTitle("Politique de confidentialité");
  return (
    <section className="section legal">
      <div className="container container--narrow">
        <h1>Politique de confidentialité</h1>
        <p>
          Dernière mise à jour&nbsp;: {MAJ}. Cette politique s'applique à
          l'application mobile SPAWT et au portail web spawt.online.
        </p>

        <h2>1. Qui traite tes données</h2>
        <p>
          Le responsable du traitement est <strong>SPAWT / UPGRADERS</strong>{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: dénomination sociale exacte, RCCM,
          siège social]</mark>, joignable à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Les
          traitements sont effectués conformément à la{" "}
          <strong>loi n°&nbsp;2013-450 du 19 juin 2013</strong> relative à la
          protection des données à caractère personnel en Côte d'Ivoire, sous le
          contrôle de l'<strong>ARTCI</strong> (Autorité de Régulation des
          Télécommunications/TIC de Côte d'Ivoire).{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: numéro de déclaration /
          autorisation ARTCI à insérer une fois obtenu]</mark>
        </p>

        <h2>2. Ce qu'on collecte, et pourquoi</h2>
        <ul>
          <li>
            <strong>Ton numéro de téléphone</strong> — pour créer et sécuriser
            ton compte (connexion par code SMS). Base légale&nbsp;: exécution du
            contrat.
          </li>
          <li>
            <strong>Ta localisation</strong> : quand tu utilises SPAWT et
            autorises la localisation, la position de ton téléphone peut servir
            à afficher des lieux proches et à vérifier que tu es sur place pour
            un spawt manuel.
          </li>
          <li>
            <strong>Le Guet sur Android</strong> : si tu choisis de l’activer et
            accordes l’autorisation Android de localisation en arrière-plan, ton
            téléphone détecte l’entrée et la sortie de zones autour de lieux,
            même lorsque SPAWT est fermé ou que tu ne l’utilises pas. Le Guet
            peut t’alerter quand tu es proche d’un lieu à découvrir ou que tu as
            enregistré. Si tu as validé une visite, il peut aussi te rappeler de
            laisser un avis après ton départ. La détection de proximité ne
            valide jamais une visite. Tu peux couper le Guet dans Paramètres →
            Le Guet ou retirer l’autorisation dans les réglages Android. Le spawt
            manuel reste disponible avec l’autorisation de localisation au
            premier plan quand elle est nécessaire.
          </li>
          <li>
            <strong>Ton activité dans l'app</strong> (spawts, avis, Coups de
            Cœur, préférences du Palais) — pour construire tes recommandations
            personnalisées. Base légale&nbsp;: exécution du contrat.
          </li>
          <li>
            <strong>Tes données de paiement Gold</strong> — traitées par notre
            prestataire de paiement (CinetPay)&nbsp;; SPAWT ne stocke jamais tes
            identifiants Mobile Money. Nous conservons uniquement la référence
            de transaction et la facture.
          </li>
        </ul>
        <p>
          <mark>[À VALIDER PAR JURISTE&nbsp;: liste exhaustive des traitements
          et bases légales, registre des traitements]</mark>
        </p>

        <h2>3. Ce qu'on ne fait pas</h2>
        <ul>
          <li>Pas de vente de tes données personnelles à des tiers.</li>
          <li>
            Pas de publicité ciblée fondée sur ton identité individuelle&nbsp;:
            les lieux partenaires reçoivent des statistiques{" "}
            <strong>agrégées et anonymisées</strong> (jamais «&nbsp;qui&nbsp;»,
            seulement «&nbsp;combien et quels profils de goût&nbsp;»).
          </li>
          <li>Pas de prélèvement automatique sur ton Mobile Money.</li>
        </ul>

        <h2>4. Combien de temps on garde tes données</h2>
        <p>
          Ton compte et son historique sont conservés tant que ton compte est
          actif, puis supprimés ou anonymisés dans un délai de{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: durée de conservation précise, p.
          ex. 12 mois après suppression du compte]</mark>. Les données de
          facturation sont conservées pendant la durée légale comptable
          ivoirienne <mark>[À VALIDER PAR JURISTE&nbsp;: 10 ans, à
          confirmer]</mark>.
        </p>

        <h2>5. Où sont hébergées tes données</h2>
        <p>
          Les données sont hébergées sur un serveur privé virtuel (VPS)
          administré par SPAWT et sur l'infrastructure de notre prestataire de
          base de données. <mark>[À VALIDER PAR JURISTE&nbsp;: localisation
          exacte des serveurs, encadrement du transfert transfrontalier de
          données au sens de la loi 2013-450]</mark>
        </p>

        <h2>6. Tes droits</h2>
        <p>
          Conformément à la loi n°&nbsp;2013-450, tu disposes d'un droit
          d'accès, de rectification, de suppression et d'opposition sur tes
          données. Pour l'exercer&nbsp;: écris à{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> depuis le
          numéro ou l'adresse liés à ton compte. On te répond sous{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: délai de réponse, p. ex. 30
          jours]</mark>. Tu peux aussi saisir l'ARTCI si tu estimes que tes
          droits ne sont pas respectés.
        </p>
        <p>
          La suppression de ton compte est aussi disponible directement dans
          l'app (Profil → Réglages → Supprimer mon compte), comme l'exigent les
          politiques App Store et Google Play. Procédure détaillée (y compris
          sans l'app)&nbsp;: voir la page{" "}
          <Link to="/legal/suppression-compte">Supprimer mon compte</Link>.
        </p>

        <h2>7. Mineurs</h2>
        <p>
          SPAWT s'adresse aux personnes de 16 ans et plus.{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: âge minimal et modalités de
          vérification]</mark>
        </p>

        <h2>8. Évolutions de cette politique</h2>
        <p>
          Si cette politique change de façon substantielle, on te prévient dans
          l'app ou par SMS avant l'entrée en vigueur. La version en ligne sur
          spawt.online/legal/confidentialite fait foi.
        </p>
      </div>
    </section>
  );
}
