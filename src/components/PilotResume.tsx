import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { usePilotJourney, validResumeToken } from "../lib/pilot-journey";
import { installDevice } from "../lib/install-device";
import "../styles/pilot-install.css";

type Journey = ReturnType<typeof usePilotJourney>;

function CopyValue({ value, kind }: { value: string; kind: "code" | "lien" }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const fallback = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (state === "manual") { fallback.current?.focus(); fallback.current?.select(); }
  }, [state]);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setState("copied"); }
    catch { setState("manual"); }
  }
  return <div className="pilot-copy">
    <button type="button" onClick={() => void copy()}>Copier le {kind}</button>
    <span role="status">{state === "copied" ? (kind === "code" ? "Code copié." : "Lien copié.") :
      state === "manual" ? "Sélectionne le texte puis choisis Copier." : ""}</span>
    {state === "manual" && <input ref={fallback} aria-label={kind === "code" ? "Code à copier" : "Lien à copier"} value={value} readOnly onFocus={e => e.currentTarget.select()} />}
  </div>;
}

function PhoneTransfer({ entry }: { entry: Journey["entry"] }) {
  const params = entry.source === "unknown" ? "" : "?" + new URLSearchParams({
    utm_source: entry.source, utm_medium: entry.medium, utm_campaign: entry.campaign, utm_content: entry.creative,
  }).toString();
  const publicLink = "https://spawt.online/" + params + "#telecharger";
  return <div className="pilot-transfer">
    <p>Scanne ce QR code avec l’appareil photo de ton téléphone Android.</p>
    <img alt="QR code du téléchargement SPAWT" width="186" height="186" src={"/brand/install/qr-" + entry.source + ".png"} />
    <CopyValue value={publicLink} kind="lien" />
  </div>;
}

export function PilotResume({ journey, transferPanelRef }: {
  journey: ReturnType<typeof usePilotJourney>;
  transferPanelRef?: (node: HTMLDivElement | null) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const box = dialog.current;
    if (!journey.showResume || !box) return;
    if (typeof box.showModal === "function") {
      if (!box.open) box.showModal();
      return;
    }
    // Legacy WebViews render the fallback in document flow. Native modal focus is unavailable.
    const opener = document.activeElement;
    box.setAttribute("open", "");
    box.focus();
    return () => { if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); };
  }, [journey.showResume]);
  if (!journey.showResume) return null;
  const receipt = journey.receipt;
  const device = installDevice();
  const socialBrowser = /Instagram/i.test(navigator.userAgent) ? "Instagram" :
    /FBAN|FBAV|FB_IAB|FB4A/i.test(navigator.userAgent) ? "Facebook" : null;
  return <dialog className="pilot-resume" role="dialog" tabIndex={-1} aria-labelledby="reprise-titre" ref={dialog}
    onClose={() => journey.setShowResume(false)} onKeyDown={event => {
      if (event.key === "Escape" && typeof dialog.current?.showModal !== "function") journey.setShowResume(false);
    }}>
    <form method="dialog" onSubmit={event => {
      event.preventDefault();
      if (typeof dialog.current?.close === "function") dialog.current.close();
      journey.setShowResume(false);
    }}><button aria-label="Fermer">Fermer</button></form>
    <h2 id="reprise-titre">{device === "desktop" ? "Continuer sur ton téléphone" : device === "apple" ? "SPAWT sur iPhone" : "Après l’installation"}</h2>
    <div ref={transferPanelRef} />
    {device === "desktop" ? <PhoneTransfer entry={journey.entry} /> :
      device === "apple" ? <Link className="accueil-apk" to="/carte">Explorer la carte</Link> : <>
    <p>Ouvre l’APK SPAWT dans <strong>Téléchargements</strong>, puis appuie sur <strong>Installer</strong>. Reviens ensuite dans cet onglet.</p>
    {receipt && receipt.expires > Date.now() ? <>
      <a className="accueil-apk" href={"https://spawt.online/reprendre/" + receipt.token} rel="noreferrer">Ouvrir SPAWT après installation</a>
      <div className="pilot-code-panel">
        <p>Pour retrouver ton lieu dans l’app, choisis « Reprendre avec un code ».</p>
        <output aria-label="Code de reprise">{receipt.code}</output>
        <CopyValue key={receipt.code} value={receipt.code} kind="code" />
      </div>
    </> : journey.error ? <div role="status">
      <p>Ton code est momentanément indisponible. Tu peux déjà utiliser SPAWT.</p>
      <button type="button" onClick={() => void journey.issue()}>Retrouver mon code</button>
    </div> : <p role="status">Préparation de ton code de reprise…</p>}
    <details className="pilot-install-help"><summary>Le fichier ne s’ouvre pas ?</summary>
      {socialBrowser && <p>Dans le menu {socialBrowser === "Instagram" ? "d’Instagram" : "de Facebook"}, choisis d’ouvrir cette page dans ton navigateur.</p>}
      <p>Si Android te demande une autorisation, touche <strong>Paramètres</strong>, puis <strong>Autoriser cette source</strong> pour l’appli qui ouvre l’APK. Garde Play Protect activé.</p>
    </details></>}
  </dialog>;
}

export function ResumeLanding() {
  const token = useParams().token || "";
  if (installDevice() === "apple") return <section className="pilot-return">
    <h1>Les adresses de la Bande.</h1><Link className="pilot-return-link" to="/carte">Explorer la carte sur iPhone</Link>
  </section>;
  return <section className="pilot-return">
    <h1>Retrouver ton spawt.</h1>
    {validResumeToken(token) ? <>
      <p>Sur Android, ouvre SPAWT pour reprendre ton parcours.</p>
      <a className="pilot-return-link" href={"spawt://reprendre/" + token} rel="noreferrer">Ouvrir SPAWT</a>
      <p>Si le navigateur bloque l’ouverture, ouvre l’app puis saisis le code affiché dans l’onglet du téléchargement.</p>
    </> : <p>Ce lien de reprise est incomplet. Tu peux saisir ton code dans l’app.</p>}
    <Link to="/#telecharger">Retrouver le téléchargement Android</Link>
  </section>;
}
