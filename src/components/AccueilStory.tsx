const art = "/brand/accueil/";

export function CityStory() {
  return <section className="city-story" aria-labelledby="city-title">
    <div className="city-copy">
      <p className="story-kicker">Qu’est-ce que SPAWT ?</p>
      <h2 id="city-title">C’était où,<br />ce maquis&nbsp;?</h2>
      <p>L’adresse est quelque part dans tes captures d’écran. Ou dans un vocal. Et ce soir, tout le monde a faim.</p>
      <p><strong>SPAWT est l’app gratuite pour choisir où manger à Abidjan.</strong> Retrouve les adresses sur la carte, regarde ce que la Bande a goûté et garde celles qui te tentent.</p>
    </div>
    <figure className="city-view">
      <img src={art + "abidjan-lagune-1440.webp"} srcSet={art + "abidjan-lagune-680.webp 680w, " + art + "abidjan-lagune-1440.webp 1440w"} sizes="(max-width: 750px) 100vw, 58vw"
        width="1440" height="539" loading="lazy" decoding="async" alt="Les lumières du Plateau se reflètent dans la lagune Ébrié, vues depuis Treichville." />
      <figcaption><strong>Le Plateau, vu de Treichville</strong>
        <span><a href="https://commons.wikimedia.org/wiki/File:Le_Plateau_depuis_Treichville_%E2%80%93_Abidjan.jpg">Edison McCullen</a> · <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> · recadrage</span>
      </figcaption>
    </figure>
  </section>;
}

export function PalaisStory() {
  return <section id="mon-palais" className="palais-story" aria-labelledby="palais-titre">
    <div className="palais-inner">
      <div className="palais-heading">
        <p className="story-kicker">Le Palais</p>
        <h2 id="palais-titre">À chacun<br />son Palais<b>.</b></h2>
        <p>Tu changes de quartier pour goûter un nouveau braisé ? Ou le maquis du coin connaît déjà ta commande ? Dans SPAWT, ton Palais raconte ta façon de manger et de choisir une table.</p>
      </div>
      <div className="palais-portraits">
        <figure><img src={art + "palais-pisteur.webp"} width="900" height="672" loading="lazy" decoding="async" alt="Illustration du Pisteur de Rue dans SPAWT" /><figcaption><strong>Pisteur de Rue</strong><span>Toujours une nouvelle adresse en tête.</span></figcaption></figure>
        <figure><img src={art + "palais-gardien.webp"} width="900" height="672" loading="lazy" decoding="async" alt="Illustration du Gardien du Maquis dans SPAWT" /><figcaption><strong>Gardien du Maquis</strong><span>Sa table est déjà toute trouvée.</span></figcaption></figure>
      </div>
    </div>
  </section>;
}
