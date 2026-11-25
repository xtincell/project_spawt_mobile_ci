import { useEffect, useState } from "react";
import { Link } from "react-router";
import { loadPublicPlaces, type PublicPlace } from "../../lib/public-places";
import "../../styles/discovery.css";

export function LivePlaces({ limit = 4 }: { limit?: number }) {
  const [places, setPlaces] = useState<PublicPlace[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    loadPublicPlaces(controller.signal).then(rows => {
      if (!controller.signal.aborted) { setPlaces(rows); setStatus("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setStatus("error"); });
    return () => controller.abort();
  }, [attempt]);
  return <div className="live-places">
    <p className="live-places__intro">Où sera ta prochaine sortie ?</p>
    {status === "loading" && <p role="status">Les adresses arrivent…</p>}
    {status === "error" && <p role="alert">Les adresses ne sont pas disponibles pour le moment. <button onClick={() => setAttempt(a => a + 1)}>Réessayer</button></p>}
    {status === "ready" && places.length === 0 && <p>Les nouvelles adresses seront bientôt ici.</p>}
    {status === "ready" && <div className="live-places__list">
      {places.slice(0, limit).map((place, i) => <Link key={place.id} className="live-place" to={`/carte?lieu=${encodeURIComponent(place.id)}`}>
        <span className="live-place__number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
        <div><small>{place.neighborhood || place.city}</small><h3>{place.name}</h3>{place.cuisine.length > 0 && <p>{place.cuisine.join(" · ")}</p>}</div>
        <img className="live-place__arrow" src="/brand/accueil/suivant.png" width={16} height={16} alt="" />
      </Link>)}
    </div>}
  </div>;
}
