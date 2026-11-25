// Table de routage de la vitrine SPAWT.
//
// Une seule vraie page (`/`) plus les pages légales. Ces dernières ne sont
// pas décoratives : Apple et Google exigent une URL de politique de
// confidentialité ET un chemin de suppression de compte pour accepter une
// fiche sur les stores. Les retirer de la vitrine reviendrait à bloquer la
// publication de l'app qu'elle annonce.
//
// Plus de <PreviewGate> (le rideau d'avant-lancement est levé), plus de
// <AuthProvider> ni de <RequireAuth> (il n'y a plus rien à protéger).

import { BrowserRouter, Routes, Route } from "react-router";
import { lazy, Suspense } from "react";
const MapPage = lazy(() => import("./pages/MapPage"));
import Layout from "./components/Layout";
import { LeChaReview } from "./components/LeChaReview";
import { ResumeLanding } from "./components/PilotResume";
import ConfidentialitePage from "./pages/legal/ConfidentialitePage";
import CguPage from "./pages/legal/CguPage";
import CgvPage from "./pages/legal/CgvPage";
import SuppressionComptePage from "./pages/legal/SuppressionComptePage";
import NotFoundPage from "./pages/NotFoundPage";
import StatusPage from "./pages/StatusPage";
import { PublicBrandProvider } from "./lib/public-brand";
import DirectionA from "./pages/proposals/DirectionA";
import DirectionB from "./pages/proposals/DirectionB";
import Accueil, { AccueilHeader } from "./pages/Accueil";
import DirectionC, { ShowcaseHeader } from "./pages/proposals/DirectionC";

export default function App() {
  return (
    <PublicBrandProvider><BrowserRouter>
      <Routes>
        <Route element={<Layout header={<AccueilHeader />} className="accueil-layout" />}>
          <Route path="/" element={<Accueil />} />
          <Route path="/ouvrir/avis/le-cha-alexandre" element={<LeChaReview reader />} />
          <Route path="/trouvailles/:slug" element={<LeChaReview reader />} />
        </Route>
        {import.meta.env.DEV && <Route element={<Layout header={<ShowcaseHeader />} className="showcase-layout" />}>
          <Route path="/_propositions/c" element={<DirectionC />} />
        </Route>}
        <Route element={<Layout />}>
          {import.meta.env.DEV && <Route path="/_propositions/a" element={<DirectionA />} />}
          {import.meta.env.DEV && <Route path="/_propositions/b" element={<DirectionB />} />}
          <Route path="/carte" element={<Suspense fallback={<p>Chargement de la carte…</p>}><MapPage /></Suspense>} />
          <Route path="/reprendre/:token" element={<ResumeLanding />} />
          <Route path="/statut" element={<StatusPage />} />
          <Route path="/legal/confidentialite" element={<ConfidentialitePage />} />
          <Route path="/legal/cgu" element={<CguPage />} />
          <Route path="/legal/cgv" element={<CgvPage />} />
          <Route path="/legal/suppression-compte" element={<SuppressionComptePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter></PublicBrandProvider>
  );
}
