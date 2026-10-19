import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { usePageTitle } from '../lib/use-page-title';
import { readPublicStatus, type PublicCheck } from '../lib/public-status';
import { useAndroidRelease } from '../lib/android-release';
const labels = { places: 'Lieux publiés', editorials: 'Avis éditoriaux', collections: 'Carnets', announcements: 'Fil du Chat', sync: 'Actualisation des contenus' };
export default function StatusPage() {
  usePageTitle('Vérifier les contenus SPAWT');
  const [rows, setRows] = useState<PublicCheck[]>([]); const [busy, setBusy] = useState(false); const [checkedAt, setCheckedAt] = useState('');
  const active = useRef(true); const pending = useRef(false); const release = useAndroidRelease();
  const check = async () => {
    if (pending.current) return;
    pending.current = true; setBusy(true);
    const next = await readPublicStatus();
    pending.current = false;
    if (active.current) { setRows(next); setCheckedAt(new Date().toLocaleString('fr-FR')); setBusy(false); }
  };
  useEffect(() => { active.current = true; void check(); return () => { active.current = false; }; }, []);
  return <section className="section legal"><div className="container container--narrow">
    <h1>Les contenus arrivent-ils bien ?</h1>
    <p>Cette page relit les contenus publics de SPAWT depuis ton navigateur. Compare ce résultat avec « Aide et retours » dans les paramètres de l’app.</p>
    <button className="btn btn--primary" onClick={() => void check()} disabled={busy}>{busy ? 'Vérification…' : 'Vérifier à nouveau'}</button>
    <p role="status">{checkedAt ? `Dernière vérification : ${checkedAt}` : 'Lecture des contenus en cours…'}</p>
    <dl className="content-status">{rows.map(row => <div key={row.key} data-testid={`status-${row.key}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, paddingBlock: 14, borderBottom: '1px solid var(--border)' }}>
      <dt>{labels[row.key]}</dt><dd style={{ margin: 0, textAlign: 'right' }}>{row.ok ? (row.count === undefined ? 'Accessible' : `${row.count} accessible${row.count === 1 ? '' : 's'}`) : 'Indisponible — réessaie'}</dd>
    </div>)}</dl>
    <p>Un résultat de zéro signifie qu’aucun contenu n’est publié dans cette rubrique. Un échec de lecture est affiché comme indisponible.</p>
    <h2>La version disponible</h2>
    <p>Android {release.version} · build {release.build}. Le bouton suit la dernière version publiée après ses contrôles.</p>
    <p><a href={release.url}>Télécharger cette version</a> · <a href="https://github.com/xtincell/spawt-ci-mobile-v1-mvp/releases" target="_blank" rel="noreferrer">Voir les versions et leurs preuves</a></p>
    <h2>Quelque chose ne va pas ?</h2>
    <p>Dans l’app, ouvre Palais → Paramètres → Aide et retours. Tu peux vérifier les contenus, signaler un souci, proposer une idée et retrouver la réponse de l’équipe. Les écrans en erreur proposent aussi un accès direct.</p>
    <p>Cette lecture publique confirme l’accès aux contenus depuis ce navigateur. La connexion à ton compte et l’envoi de tes avis se vérifient depuis l’app.</p>
    <Link to="/">Retour à SPAWT</Link>
  </div></section>;
}
