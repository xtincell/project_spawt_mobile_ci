// Badges App Store / Google Play — placeholders maison (pas d'assets officiels
// tant que l'app n'est pas publiée). Liens pilotés par VITE_APPSTORE_URL /
// VITE_PLAYSTORE_URL ; si absents, le badge affiche « bientôt » sans lien.

import { APPSTORE_URL, PLAYSTORE_URL } from "../lib/config";

function Badge({ name, url }: { name: string; url?: string }) {
  if (!url) {
    return (
      <span className="store-badge store-badge--soon" aria-disabled="true">
        <span className="store-badge__hint">Bientôt sur</span>
        <span className="store-badge__name">{name}</span>
      </span>
    );
  }
  return (
    <a className="store-badge" href={url} target="_blank" rel="noreferrer">
      <span className="store-badge__hint">Télécharger sur</span>
      <span className="store-badge__name">{name}</span>
    </a>
  );
}

export default function StoreBadges() {
  return (
    <div className="store-badges">
      <Badge name="App Store" url={APPSTORE_URL} />
      <Badge name="Google Play" url={PLAYSTORE_URL} />
    </div>
  );
}
