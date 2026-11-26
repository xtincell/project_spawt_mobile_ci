import { useState } from "react";

const art = "/brand/accueil/";
const steps = [
  { action: "Repérer", title: "Trouve une table dans ton quartier.", detail: "Parcours les repères sur la carte d’Abidjan. Touche une adresse pour voir ce qui t’y attend.", screen: "app-carte-explorer.webp", alt: "La carte des adresses d’Abidjan dans SPAWT.", icon: "etablissement" },
  { action: "Choisir", title: "Vois ce qui a plu à table.", detail: "Chez Le Cha, un membre a aimé le goût et la déco. Sa photo et ses notes sur le service t’aident à faire ton choix.", screen: "app-fiche-le-cha.webp", alt: "La fiche de Le Cha avec l’avis sur la cuisine, le cadre et le service.", icon: "commenter" },
  { action: "Garder", title: "Garde ton prochain brunch sous la main.", detail: "Un plat te tente ? Ajoute-le à tes envies et retrouve son adresse quand la Bande te demande où aller.", screen: "app-envies-enregistrees.webp", alt: "Un plat enregistré dans Mes envies pour une prochaine sortie.", icon: "plats" },
] as const;

export function InsideSpawt() {
  const [selected, setSelected] = useState(0);
  const step = steps[selected];
  return <section className="inside" id="dans-spawt" aria-labelledby="inside-title">
    <div className="inside-inner">
      <div className="inside-copy">
        <p className="story-kicker">Dans l’app</p>
        <h2 id="inside-title">De la carte<br />à ta table<b>.</b></h2>
        <div className="inside-steps" role="group" aria-label="Parcourir les écrans de SPAWT">
          {steps.map((item, index) => <button key={item.action} type="button" aria-pressed={index === selected}
            aria-controls="apercu-app" onClick={() => setSelected(index)}>
            <img src={art + item.icon + ".png"} width="28" height="28" alt="" /><span>{item.action}</span>
            <img className="inside-arrow" src={art + "suivant.png"} width="18" height="18" alt="" />
          </button>)}
        </div>
      </div>
      <figure className="inside-stage" id="apercu-app" data-step={selected}>
        <div className="inside-phone">
          <img key={step.screen} src={art + step.screen} loading="lazy" decoding="async" width="780" height="1688" alt={step.alt} />
        </div>
        <figcaption aria-live="polite" aria-atomic="true"><strong>{step.title}</strong><span>{step.detail}</span></figcaption>
      </figure>
    </div>
  </section>;
}
