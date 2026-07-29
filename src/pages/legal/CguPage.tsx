// /legal/cgu — Conditions Générales d'Utilisation (app + portail).
// Squelette complet destiné à être déclaré aux stores. Les points
// d'engagement portent le marqueur [À VALIDER PAR JURISTE].

import { Link } from "react-router";
import { CONTACT_EMAIL } from "../../lib/config";
import { usePageTitle } from "../../lib/use-page-title";

const MAJ = "26 juillet 2026";

export default function CguPage() {
  usePageTitle("Conditions générales d'utilisation");
  return (
    <section className="section legal">
      <div className="container container--narrow">
        <h1>Conditions générales d'utilisation</h1>
        <p>
          Dernière mise à jour&nbsp;: {MAJ}. En créant un compte SPAWT ou en
          utilisant l'application et le portail spawt.online, tu acceptes les
          présentes conditions.
        </p>

        <h2>1. L'éditeur</h2>
        <p>
          SPAWT est édité par <strong>SPAWT / UPGRADERS</strong>{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: forme sociale, capital, RCCM,
          siège, représentant légal]</mark>. Contact&nbsp;:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Le portail
          est hébergé sur un serveur privé virtuel (VPS){" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: identité et adresse de
          l'hébergeur]</mark>.
        </p>

        <h2>2. Le service</h2>
        <p>
          SPAWT est un compagnon de découverte culinaire communautaire à
          Abidjan&nbsp;: recommandations personnalisées (le Palais), spawts
          vérifiés (Le Guet), avis et Coups de Cœur de la communauté (la
          Meute). Le service de base est gratuit dans un rayon limité&nbsp;;
          l'abonnement Spawter Gold (cf. <Link to="/legal/cgv">CGV</Link>)
          déverrouille l'ensemble du contenu.
        </p>

        <h2>3. Ton compte</h2>
        <ul>
          <li>
            Un compte = un numéro de téléphone ivoirien vérifié par code SMS.
            Tu es responsable de l'accès à ta ligne.
          </li>
          <li>
            Tu dois avoir au moins 16 ans{" "}
            <mark>[À VALIDER PAR JURISTE&nbsp;: âge]</mark>.
          </li>
          <li>
            Tu peux supprimer ton compte à tout moment (dans l'app ou par
            email)&nbsp;— cf. la page{" "}
            <Link to="/legal/suppression-compte">Supprimer mon compte</Link> et
            la{" "}
            <Link to="/legal/confidentialite">politique de confidentialité</Link>.
          </li>
        </ul>

        <h2>4. Tes contenus (avis, photos, spawts)</h2>
        <ul>
          <li>
            Tes avis restent tes propos&nbsp;: tu en es responsable. Tu accordes
            à SPAWT une licence non exclusive, mondiale et gratuite pour les
            afficher et les agréger dans le service{" "}
            <mark>[À VALIDER PAR JURISTE&nbsp;: étendue et durée de la
            licence]</mark>.
          </li>
          <li>
            Sont interdits&nbsp;: contenus diffamatoires, haineux, mensongers,
            à caractère publicitaire déguisé, ou portant atteinte aux droits de
            tiers.
          </li>
          <li>
            Les avis sont liés à des spawts vérifiés par géolocalisation&nbsp;:
            publier de faux avis ou manipuler la vérification (Le Guet) entraîne
            la suspension du compte.
          </li>
        </ul>

        <h2>5. Ce que SPAWT s'engage à faire (et pas)</h2>
        <ul>
          <li>
            On fait au mieux pour que les infos des lieux (horaires, position,
            cartes) soient justes — elles proviennent de la communauté et des
            lieux eux-mêmes, et peuvent être inexactes. Vérifie avant de
            traverser la ville.
          </li>
          <li>
            Le service est fourni «&nbsp;en l'état&nbsp;», sans garantie de
            disponibilité continue. On peut suspendre le service pour
            maintenance.
          </li>
          <li>
            La responsabilité de SPAWT ne saurait être engagée pour la qualité
            des repas, l'accueil ou l'hygiène des lieux référencés{" "}
            <mark>[À VALIDER PAR JURISTE&nbsp;: clause limitative de
            responsabilité conforme au droit ivoirien de la
            consommation]</mark>.
          </li>
        </ul>

        <h2>6. Comptes des lieux (B2B)</h2>
        <p>
          Les gérants d'établissements peuvent revendiquer leur fiche et
          souscrire aux offres Spawt Libre, Pro ou Gold (prix HT, cf.{" "}
          <Link to="/pro">Espace lieux</Link> et{" "}
          <Link to="/legal/cgv">CGV</Link>). Répondre aux avis engage
          l'établissement, qui s'interdit toute pression sur les spawters.
        </p>

        <h2>7. Propriété intellectuelle</h2>
        <p>
          SPAWT, son logo, sa mascotte, le dialecte SPAWT (Palais, Meute,
          Guet, etc.), l'interface et le code sont protégés. Toute reproduction
          non autorisée est interdite.
        </p>

        <h2>8. Suspension et résiliation</h2>
        <p>
          SPAWT peut suspendre ou clôturer un compte en cas de fraude, de faux
          avis, d'abus du dispositif de vérification ou de non-respect des
          présentes conditions, après notification{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: procédure contradictoire et
          délais]</mark>.
        </p>

        <h2>9. Droit applicable et litiges</h2>
        <p>
          Les présentes conditions sont régies par le droit ivoirien. En cas de
          litige, une solution amiable sera recherchée avant toute action
          devant les juridictions compétentes d'Abidjan{" "}
          <mark>[À VALIDER PAR JURISTE&nbsp;: clause attributive de compétence
          et médiation préalable]</mark>.
        </p>
      </div>
    </section>
  );
}
