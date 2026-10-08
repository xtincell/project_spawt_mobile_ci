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
import Layout from "./components/Layout";
import LandingPage from "./pages/LandingPage";
import ConfidentialitePage from "./pages/legal/ConfidentialitePage";
import CguPage from "./pages/legal/CguPage";
import CgvPage from "./pages/legal/CgvPage";
import SuppressionComptePage from "./pages/legal/SuppressionComptePage";
import NotFoundPage from "./pages/NotFoundPage";
import { PublicBrandProvider } from "./lib/public-brand";

export default function App() {
  return (
    <PublicBrandProvider><BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
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
