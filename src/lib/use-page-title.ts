// Titre d'onglet par page (SPA sans SSR : on pilote document.title à la main).
import { useEffect } from "react";

export function usePageTitle(title: string): void {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · SPAWT`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
