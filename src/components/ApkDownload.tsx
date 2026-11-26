import { Link } from "react-router";
import { refreshAndroidRelease, useAndroidRelease } from "../lib/android-release";
import { APPSTORE_URL } from "../lib/config";
import { installDevice } from "../lib/install-device";

type DownloadProps = { className?: string; onDownload?: () => void; id?: string };

export function AndroidReleasePending({ failed }: { failed: boolean }) {
  return <div role="status" className="pilot-offer">{failed ? <>
    <small>Le téléchargement Android est momentanément indisponible.</small>
    <button type="button" className="accueil-apk" onClick={() => void refreshAndroidRelease(true)}>Réessayer le téléchargement</button>
  </> : <span aria-busy="true">Vérification du téléchargement Android…</span>}</div>;
}

export default function ApkDownload({ className, onDownload, id }: DownloadProps) {
  const release = useAndroidRelease();
  if (installDevice() === "apple") return <div id={id} className="pilot-offer">
    {APPSTORE_URL
      ? <a className={className} href={APPSTORE_URL}>Ouvrir dans l’App Store</a>
      : <Link className={className} to="/carte">Explorer la carte</Link>}
    <small>{APPSTORE_URL ? "Pour iPhone" : "Disponible sur le web · Gratuit"}</small>
  </div>;
  if (!release) return <AndroidReleasePending failed={release === null} />;
  const megabytes = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(release.bytes / 1e6);
  return <div id={id} className="pilot-offer">
    <a className={className} href={release.url} download={release.fileName} onClick={onDownload}
      target={onDownload ? "_blank" : undefined} rel="noopener noreferrer">
      <img src="/brand/accueil/telecharger.png" width="24" height="24" alt="" />
      <span>Télécharger l’APK</span>
    </a>
    <small>Android · Gratuit · v{release.version} · build {release.build} · {megabytes} Mo</small>
  </div>;
}
