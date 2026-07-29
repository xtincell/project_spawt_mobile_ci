// Point d'entrée du portail SPAWT (spawt.online).
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Élément #root introuvable");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
