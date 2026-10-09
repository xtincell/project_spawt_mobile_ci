// Vitrine SPAWT — page unique.
//
// ── Provenance du contenu (à ne pas improviser) ────────────────────────────
// Le socle éditorial vient de deux documents :
//   · SPAWT_BIBLE_COMPLETE.md (état consolidé du projet, février 2026)
//   · brandbook v1.0 (marque, ton, dialecte)
// Les références §x.y ci-dessous pointent la Bible. Un chiffre qui n'y est
// pas ne va pas sur cette page.
// Le nombre de questions suit le Quiz Palais servi : six, dont « Ton radar ».
//
// Ce qui a été RETIRÉ de l'ancienne landing, et pourquoi :
//   · « Le Guet » — mécanisme de vérification de présence sur place. Il
//     n'existe nulle part dans la Bible : c'était une invention. Les vrais
//     mécanismes de confiance sont la note pondérée par le stade du spawter
//     (§4.2) et la Pépite Vérifiée (§4.3) ; ils relèvent du produit, pas
//     d'une promesse de vitrine, donc ils ne sont pas repris ici non plus.
//   · « 45 minutes de débat → 3 minutes » — chiffres mélangés. La Bible dit
//     47 messages et 3 heures côté problème (§0.1), 3 taps (Rapide) et
//     5 minutes (Crew) côté solution (§8).
//   · Gold, programme ambassadeur, espace lieux — réels (§10, §14) mais
//     hors périmètre d'une vitrine sans achat.

import StoreBadges from "../components/StoreBadges";
import { IconInstinct, IconIdentite, IconCommunaute } from "../components/BrandIcons";
import { QUIZ_URL } from "../lib/config";
import { usePageTitle } from "../lib/use-page-title";
import { usePublicBrand, usePublicMascot } from "../lib/public-brand";

/** Les 3 modes contextuels — §8, tableau repris tel quel. */
const MODES = [
  {
    glyph: "⚡",
    name: "Rapide",
    question: "Où manger maintenant ?",
    declencheur: "Midi, 11h–14h",
    cible: "Décision en 3 taps",
    chat: "Il est midi passé. Tu as faim. Moi aussi.",
  },
  {
    glyph: "◎",
    name: "Crew",
    question: "On sort où ce soir ?",
    declencheur: "Vendredi et samedi soir",
    cible: "Décision de groupe en 5 min",
    chat: "Vendredi soir. Ton crew attend. Décidez en 5 minutes, pas en 45.",
  },
  {
    glyph: "◈",
    name: "Explore",
    question: "Prends ton temps.",
    declencheur: "Dimanche, temps libre",
    cible: "Découverte et inspiration",
    chat: "Dimanche. Pas de rush. Laisse le Palais te guider.",
  },
];

function Hero() {
  const brand = usePublicBrand();
  const mascot = usePublicMascot("greeting", "/brand/moka-salut.webp", "Moka, le chat calico de SPAWT, salue");
  return (
    <section className="hero">
      <div className="container hero__inner">
        <div className="hero__copy">
          <p className="kicker">Abidjan · Côte d&rsquo;Ivoire</p>
          <h1 className="hero__title">{brand.title}</h1>
          {/* Promesse maître, §13.2 — mot à mot. */}
          <p className="hero__promise">{brand.tagline}</p>
          <p className="hero__pitch">
            {brand.description}
          </p>
          <div className="hero__actions">
            <StoreBadges />
          </div>
          <p className="hero__note">
            L&rsquo;app arrive sur iOS et Android. En attendant,{" "}
            <a href={QUIZ_URL} target="_blank" rel="noreferrer">
              le quiz du Palais est déjà ouvert
            </a>
            .
          </p>
        </div>

        <div className="hero__visual">
          {/* Moka, pose « salut » — la pose canonique du design system. */}
          <img
            className="hero__moka"
            {...mascot}
            width={352}
            height={500}
          />
        </div>
      </div>
    </section>
  );
}

function Probleme() {
  return (
    <section className="section">
      <div className="container">
        <p className="kicker">Le problème</p>
        <h2 className="section-title">
          Tu n&rsquo;es pas à court d&rsquo;adresses. Tu es à court de filtre.
        </h2>

        {/* Chiffres §0.1 — les trois sont dans la Bible, aucun n'est arrondi
            pour l'effet. Ce sont des chiffres de marché, pas de traction :
            la vitrine n'annonce aucun nombre de spawters ni de lieux, parce
            qu'on ne les a pas vérifiés. */}
        <ul className="stats">
          <li className="stat">
            <span className="stat__n">15 000+</span>
            <span className="stat__label">
              points de restauration à Abidjan, du maquis de quartier à la
              grande table
            </span>
          </li>
          <li className="stat">
            <span className="stat__n">847</span>
            <span className="stat__label">
              résultats sur Google&nbsp;Maps dans 5&nbsp;km autour de Cocody.
              Tous notés pareil, pour tout le monde
            </span>
          </li>
          <li className="stat">
            <span className="stat__n">47</span>
            <span className="stat__label">
              messages et 3&nbsp;heures de débat dans le groupe — avant que
              quelqu&rsquo;un propose «&nbsp;le même endroit que d&rsquo;habitude&nbsp;»
            </span>
          </li>
        </ul>

        <blockquote className="pull">
          Le problème n&rsquo;est pas l&rsquo;offre. L&rsquo;offre est massive.
          Le problème est le filtre.
        </blockquote>
      </div>
    </section>
  );
}

function Piliers() {
  return (
    <section className="section section--warm">
      <div className="container">
        <p className="kicker">Ce que SPAWT change</p>
        <h2 className="section-title">Instinct, identité, communauté</h2>
        <p className="section-lede">
          Trois mots qui séparent un compagnon d&rsquo;un annuaire.
        </p>

        <ul className="cards">
          <li className="card">
            <div className="card__icon">
              <IconInstinct />
            </div>
            <h3 className="card__title">Instinct</h3>
            <p>
              Aucun formulaire de préférences. Le système observe tes
              explorations réelles et construit ton <strong>Palais</strong> —
              un profil de goût multidimensionnel. Ce qui en sort n&rsquo;est
              pas «&nbsp;les 10 meilleures tables de Cocody&nbsp;», c&rsquo;est
              «&nbsp;ce lieu-là, maintenant, pour toi, vu ce que tu es&nbsp;».
            </p>
          </li>
          <li className="card">
            <div className="card__icon">
              <IconIdentite />
            </div>
            <h3 className="card__title">Identité</h3>
            <p>
              Tu n&rsquo;es pas un profil anonyme derrière un pseudo. Tu es un{" "}
              <strong>spawter</strong>, avec un Palais qui a un nom, une
              trajectoire et une collection de titres gagnés en explorant. Tu
              ne consommes pas l&rsquo;app&nbsp;: tu te découvres à travers elle.
            </p>
          </li>
          <li className="card">
            <div className="card__icon">
              <IconCommunaute />
            </div>
            <h3 className="card__title">Communauté</h3>
            <p>
              Rien ici ne sort d&rsquo;un algorithme ni d&rsquo;une rédaction.
              C&rsquo;est <strong>la Meute</strong> qui explore, qui laisse ses
              traces et qui calibre la réputation d&rsquo;un lieu. SPAWT ne
              fonctionne pas sans ses spawters&nbsp;: c&rsquo;est le design, pas
              un accident.
            </p>
          </li>
        </ul>
      </div>
    </section>
  );
}

function Modes() {
  return (
    <section className="section section--night">
      <div className="container">
        <p className="kicker">Le compagnon, pas le catalogue</p>
        <h2 className="section-title">Trois modes, selon le moment</h2>
        <p className="section-lede">
          L&rsquo;app ne te pose pas la même question à midi un mardi et à 20h
          un vendredi. Elle détecte le contexte et change de forme.
        </p>

        <ul className="modes">
          {MODES.map((m) => (
            <li className="mode" key={m.name}>
              <p className="mode__glyph" aria-hidden="true">
                {m.glyph}
              </p>
              <h3 className="mode__name">{m.name}</h3>
              <p className="mode__question">{m.question}</p>
              <ul className="mode__meta">
                <li className="pill">{m.declencheur}</li>
                <li className="pill">{m.cible}</li>
              </ul>
              {/* La voix du chat : première personne, italique, guillemets. */}
              <p className="chat-voice">«&nbsp;{m.chat}&nbsp;»</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function VoixDuChat() {
  const brand = usePublicBrand();
  const mascot = usePublicMascot("curious", "/brand/moka-curieux.webp", "Moka, curieux, la queue dressée");
  return (
    <section className="section section--night">
      <div className="container container--narrow moka-block">
        <img
          className="moka-block__img"
          {...mascot}
          width={352}
          height={508}
          loading="lazy"
        />
        <div>
          <p className="kicker">La voix du chat</p>
          {/* §0.5, mot à mot. */}
          <blockquote className="moka-quote">
            {brand.identity?.voice?.quote ?? "Le chat. Pas un chatbot. Un félin. Il flaire les bons spots. Il ne suit pas, il guide. Il ne juge pas, il observe."}
            <cite>{brand.identity?.voice?.attribution ?? "Moka, la mascotte de SPAWT"}</cite>
          </blockquote>
          <p className="chat-voice">
            Sa voix change avec toi&nbsp;: taquine quand tu débutes, plus grave
            et complice à mesure que ton Palais se précise.
          </p>
        </div>
      </div>
    </section>
  );
}

function Quiz() {
  const mascot = usePublicMascot("guide", "/brand/moka-carte.webp", "Moka penché sur une carte");
  return (
    <section className="section section--warm">
      <div className="container">
        <div className="quiz-block">
          <img
            className="quiz-block__img"
            {...mascot}
            width={479}
            height={528}
            loading="lazy"
          />
          <div>
            <p className="kicker">En attendant l&rsquo;app</p>
            <h2 className="section-title">Quel spawter es-tu&nbsp;?</h2>
            <p>
              Six questions, et le chat lit ton Palais. Tu repars avec ton
              archétype — celui que tu afficheras dans l&rsquo;app le jour où
              elle sort.
            </p>
            <p style={{ marginBottom: 0 }}>
              <a className="btn btn--gold" href={QUIZ_URL} target="_blank" rel="noreferrer">
                Faire le quiz du Palais →
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Telechargement() {
  return (
    <section className="section download">
      <div className="container container--narrow">
        <img
          className="download__pin"
          src="/brand/pin.webp"
          alt=""
          width={129}
          height={200}
          loading="lazy"
        />
        <h2 className="section-title">Bientôt dans ta poche</h2>
        <p className="section-lede">
          SPAWT arrive sur iOS et Android. Les liens de téléchargement
          s&rsquo;activeront ici dès la publication.
        </p>
        <StoreBadges />
      </div>
    </section>
  );
}

export default function LandingPage() {
  const brand = usePublicBrand();
  usePageTitle(brand.title);
  return (
    <>
      <Hero />
      <Probleme />
      <Piliers />
      <Modes />
      <VoixDuChat />
      <Quiz />
      <Telechargement />
    </>
  );
}
