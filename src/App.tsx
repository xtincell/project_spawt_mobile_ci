// Table de routage du portail SPAWT.
// Décisions : react-router en mode librairie (BrowserRouter), routes plates
// sous un Layout commun, pages d'argent (/gold/paiement, /gold/retour,
// /compte, /pro/dashboard) protégées par <RequireAuth>.

import { BrowserRouter, Routes, Route } from "react-router";
import Layout from "./components/Layout";
import PreviewGate from "./components/PreviewGate";
import { AuthProvider, RequireAuth } from "./providers/AuthProvider";
import LandingPage from "./pages/LandingPage";
import GoldPage from "./pages/GoldPage";
import AmbassadeursPage from "./pages/AmbassadeursPage";
import ConnexionPage from "./pages/ConnexionPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaiementManuelPage from "./pages/PaiementManuelPage";
import RetourPage from "./pages/RetourPage";
import ComptePage from "./pages/ComptePage";
import ProPage from "./pages/ProPage";
import ProDashboardPage from "./pages/ProDashboardPage";
import ProRetourPage from "./pages/ProRetourPage";
import ConfidentialitePage from "./pages/legal/ConfidentialitePage";
import CguPage from "./pages/legal/CguPage";
import CgvPage from "./pages/legal/CgvPage";
import SuppressionComptePage from "./pages/legal/SuppressionComptePage";
import NotFoundPage from "./pages/NotFoundPage";

export default function App() {
  return (
    // Le rideau enveloppe le routeur ENTIER : sinon /gold resterait atteignable
    // en tapant l'URL, et c'est justement la page qu'on ne veut pas montrer
    // avant que CinetPay encaisse. Build public (sans VITE_PREVIEW_GATE) : le
    // composant se réduit à ses enfants, aucun code de porte n'est monté.
    <BrowserRouter>
      <PreviewGate>
        <AuthProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<LandingPage />} />
              <Route path="/gold" element={<GoldPage />} />
              <Route path="/connexion" element={<ConnexionPage />} />
              <Route
                path="/gold/paiement"
                element={
                  <RequireAuth>
                    <CheckoutPage />
                  </RequireAuth>
                }
              />
              {/* Paiement hors passerelle (Wave, Orange Money, MoMo…). Sous
                  RequireAuth : la déclaration doit être rattachée à un compte,
                  sinon personne ne sait à qui ouvrir le droit. */}
              <Route
                path="/gold/paiement-manuel"
                element={
                  <RequireAuth>
                    <PaiementManuelPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/gold/retour"
                element={
                  <RequireAuth>
                    <RetourPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/compte"
                element={
                  <RequireAuth>
                    <ComptePage />
                  </RequireAuth>
                }
              />
              <Route path="/ambassadeurs" element={<AmbassadeursPage />} />
              <Route path="/pro" element={<ProPage />} />
              <Route
                path="/pro/dashboard"
                element={
                  <RequireAuth>
                    <ProDashboardPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/pro/retour"
                element={
                  <RequireAuth>
                    <ProRetourPage />
                  </RequireAuth>
                }
              />
              <Route
                path="/legal/confidentialite"
                element={<ConfidentialitePage />}
              />
              <Route path="/legal/cgu" element={<CguPage />} />
              <Route path="/legal/cgv" element={<CgvPage />} />
              <Route
                path="/legal/suppression-compte"
                element={<SuppressionComptePage />}
              />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </PreviewGate>
    </BrowserRouter>
  );
}
