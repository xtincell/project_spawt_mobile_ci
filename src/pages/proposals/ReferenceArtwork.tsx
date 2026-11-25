import { useId } from "react";

// The approved lettering is custom artwork, not a different installed font.
// SVG viewports display exact regions of the original without regenerating them.
const reference = "/brand/editorial/reference-approved.webp";

export function ReferenceLettering({ kind }: { kind: "heading" | "sharing" | "signature" }) {
  const id = useId();
  const box = kind === "heading" ? "76 226 660 222" : kind === "signature" ? "80 450 610 39" : "638 831 900 115";
  return <svg className={`sc-lettering sc-lettering--${kind}`} viewBox={box} aria-hidden="true">
    <defs><clipPath id={`${id}-letters`}>
      {kind === "heading" ? <><rect x="76" y="226" width="470" height="100"/><rect x="76" y="326" width="660" height="122"/></> : <rect width="1586" height="992"/>}
    </clipPath><filter id={id} colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 -5 0 4" />
    </filter></defs>
    <image href={reference} width="1586" height="992" filter={`url(#${id})`} clipPath={`url(#${id}-letters)`} />
  </svg>;
}

export function ReferenceFood() {
  const id = useId();
  return <svg className="sc-reference-food" viewBox="660 90 926 722" role="img" aria-label="Composition culinaire : une assiette de poulet grillé aux épices">
    <defs><clipPath id={id}><path d="M700 90 H1586 V812 H660 V612 L703 520 L719 440 L738 430 V320 L700 315 Z" /></clipPath><filter id={`${id}-soft`}><feGaussianBlur stdDeviation="4" /></filter></defs>
    <g clipPath={`url(#${id})`}>
      <image href={reference} width="1586" height="992" />
      <rect className="sc-reference-control-patch" x="947" y="723" width="149" height="44" filter={`url(#${id}-soft)`} />
    </g>
  </svg>;
}

export function ReferenceMoka() {
  return <svg className="sc-reference-moka" viewBox="60 730 545 262" role="img" aria-label="Moka, curieux comme toi">
    <image href={reference} width="1586" height="992" />
  </svg>;
}
