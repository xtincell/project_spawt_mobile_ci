import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router";
import { usePilotJourney, validResumeToken } from "../lib/pilot-journey";

export function PilotResume({ journey }: { journey: ReturnType<typeof usePilotJourney> }) {
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
  return <dialog className="pilot-resume" role="dialog" tabIndex={-1} aria-labelledby="reprise-titre" ref={dialog}
    onClose={() => journey.setShowResume(false)} onKeyDown={event => {
      if (event.key === "Escape" && typeof dialog.current?.showModal !== "function") journey.setShowResume(false);
    }}>
    <form method="dialog" onSubmit={event => {
      event.preventDefault();
      if (typeof dialog.current?.close === "function") dialog.current.close();
      journey.setShowResume(false);
    }}><button aria-label="Fermer">Fermer</button></form>
    <h2 id="reprise-titre">Après l’installation</h2>
    <p>Ouvre le fichier téléchargé pour installer SPAWT, puis lance l’application.</p>
    {receipt && receipt.expires > Date.now() ? <>
      <a className="accueil-apk" href={"https://spawt.online/reprendre/" + receipt.token} rel="noreferrer">Ouvrir SPAWT après installation</a>
      <p>Si ton navigateur garde la main, saisis ce code dans l’app.</p>
      <output aria-label="Code de reprise">{receipt.code}</output>
    </> : journey.error ? <div role="status">
      <p>Ton code est momentanément indisponible. Tu peux déjà utiliser SPAWT.</p>
      <button type="button" onClick={() => void journey.issue()}>Retrouver mon code</button>
    </div> : <p role="status">Préparation de ton code de reprise…</p>}
  </dialog>;
}

export function ResumeLanding() {
  const token = useParams().token || "";
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
