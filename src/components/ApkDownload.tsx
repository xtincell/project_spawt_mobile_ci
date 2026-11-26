import { useEffect, useRef, useState, type MouseEvent } from "react";
import { receiveApk } from "../lib/apk-receipt";
import { Link } from "react-router";
import { refreshAndroidRelease, useAndroidRelease } from "../lib/android-release";
import { APPSTORE_URL } from "../lib/config";

import { installDevice } from "../lib/install-device";

type DownloadProps = { className?: string; onDownload?: () => void; onReceived?: (build:number,bytes:number)=>void; id?: string };
export function AndroidReleasePending({ failed }: { failed: boolean }) {
  return <div role="status" className="pilot-offer">{failed ? <>
    <small>Le téléchargement Android est momentanément indisponible.</small>
    <button type="button" className="accueil-apk" onClick={() => void refreshAndroidRelease(true)}>Réessayer le téléchargement</button>
  </> : <span aria-busy="true">Vérification du téléchargement Android…</span>}</div>;
}

export default function ApkDownload({ className, onDownload, onReceived, id }: DownloadProps) {
  const release = useAndroidRelease();
  const request=useRef<AbortController|null>(null);
  const stored=useRef<string|null>(null);
  const [saving,setSaving]=useState<{url:string;name:string}|null>(null);
  const [transfer,setTransfer]=useState<"idle"|"loading"|"failed">("idle");
  useEffect(()=>()=>{request.current?.abort();if(stored.current)URL.revokeObjectURL(stored.current);},[]);
  function begin(event:MouseEvent<HTMLAnchorElement>) {
    if (!release || event.button!==0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    onDownload?.();
    if (!onReceived || typeof URL.createObjectURL!=="function" || typeof Blob.prototype.arrayBuffer!=="function") return;
    event.preventDefault();
    if (request.current) return;
    if (stored.current) { URL.revokeObjectURL(stored.current);stored.current=null;setSaving(null); }
    const controller=new AbortController();
    request.current=controller;
    setTransfer("loading");
    void receiveApk(release,controller.signal).then(blob=>{
      if (controller.signal.aborted) return;
      const url=URL.createObjectURL(blob);
      stored.current=url;
      setSaving({url,name:release.fileName});
      setTransfer("idle");
      onReceived(release.build,blob.size);
      // Certains navigateurs embarqués exigent encore un geste manuel.
      const save=document.createElement("a");
      save.href=url;save.download=release.fileName;
      document.body.append(save);
      try { save.click(); } finally { save.remove(); }
    }).catch(()=>{
      if (!controller.signal.aborted) setTransfer("failed");
    }).finally(()=>{if(request.current===controller)request.current=null;});
  }
  if (installDevice() === "apple") return <div id={id} className="pilot-offer">
    {APPSTORE_URL
      ? <a className={className} href={APPSTORE_URL}>Ouvrir dans l’App Store</a>
      : <Link className={className} to="/carte">Explorer la carte</Link>}
    <small>{APPSTORE_URL ? "Pour iPhone" : "Disponible sur le web · Gratuit"}</small>
  </div>;
  if (!release) return <AndroidReleasePending failed={release === null} />;
  const megabytes = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(release.bytes / 1e6);
  return <div id={id} className="pilot-offer">
    <a className={className} href={release.url} download={release.fileName} onClick={begin}
      target={onDownload ? "_blank" : undefined} rel="noopener noreferrer">
      <img src="/brand/accueil/telecharger.png" width="24" height="24" alt="" />
      <span>Télécharger l’APK</span>
    </a>
    {transfer==="loading" && <p role="status">Réception de l’APK en cours… Ne ferme pas cette page. <a href={release.url} download={release.fileName} onClick={()=>{request.current?.abort();request.current=null;setTransfer("idle");}}>Utiliser le téléchargement direct</a></p>}
    {transfer==="failed" && <p role="status">La réception n’a pas pu être confirmée. <a href={release.url} download={release.fileName}>Télécharger directement</a></p>}
    {saving && <p role="status">APK reçu. <a href={saving.url} download={saving.name}>Enregistrer le fichier APK</a></p>}
    <small>Android · Gratuit · v{release.version} · build {release.build} · {megabytes} Mo</small>
  </div>;
}
