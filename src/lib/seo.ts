import { communityPlaces } from "./community-places";

export const origin = "https://spawt.online";
export const downloadPath = "/downloads/spawt-latest.apk";
export const placePath = (slug: string) => slug === "le-cha" ? "/ouvrir/avis/le-cha-alexandre" : "/trouvailles/" + slug;
export const legalPages = [
  ["/legal/confidentialite", "Politique de confidentialité", "Comment SPAWT traite les données et comment exercer tes droits."],
  ["/legal/cgu", "Conditions générales d’utilisation", "Consulte les conditions d’utilisation de l’application et du site SPAWT."],
  ["/legal/cgv", "Conditions générales de vente", "Consulte les conditions de vente des services SPAWT."],
  ["/legal/suppression-compte", "Supprimer son compte", "Retrouve la procédure pour demander la suppression de ton compte SPAWT."],
];
export type PageMeta = {
  title: string; description: string; path?: string; image?: string; alt?: string; noindex?: boolean;
};
const home: PageMeta = {
  title: "SPAWT · Où manger à Abidjan ? Télécharger l’app Android",
  description: "Explore les tables et maquis d’Abidjan, lis les avis de la Bande et garde tes adresses favorites dans SPAWT, l’application Android gratuite.",
  path: "/", image: "spawt", alt: "SPAWT · Où manger à Abidjan ? Une scène de grillades à Marcory.",
};
const places: PageMeta[] = communityPlaces.map(place => ({
  path: placePath(place.slug),
  title: place.name + " à Marcory, Abidjan · Avis et adresse | SPAWT",
  description: place.name + " à Abidjan. " + place.specialty + ". " + place.address + ". Découvre l’avis, les photos et la fiche du lieu sur SPAWT.",
  image: place.slug, alt: place.slug === "dipndip" ? place.front.alt : place.meal.alt,
}));
export const publicPages: PageMeta[] = [
  home,
  { path: "/carte", title: "Carte des tables et maquis d’Abidjan | SPAWT", description: "Explore la carte des adresses à Abidjan et retrouve les lieux partagés par la Bande." },
  ...places,
  ...legalPages.map(([path, name, description]) => ({ path, title: name + " | SPAWT", description })),
];
export const resumeMeta = { title: "Reprendre dans SPAWT", description: "Retrouve ton parcours dans l’application Android SPAWT.", noindex: true };
export const missingMeta = { title: "Page introuvable | SPAWT", description: "Retrouve les bonnes adresses d’Abidjan sur SPAWT.", noindex: true };
export function pageMeta(pathname: string): PageMeta {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/reprendre/")) return resumeMeta;
  if (path === "/statut") return { title: "Statut des services | SPAWT", description: "Consulte l’état des services de SPAWT.", noindex: true };
  if (path === "/trouvailles/le-cha") return places[0];
  return publicPages.find(page => page.path === path) ?? missingMeta;
}
export const softwareApplication = {
  "@context": "https://schema.org", "@type": "SoftwareApplication", "@id": origin + "/#application",
  name: "SPAWT", operatingSystem: "Android", applicationCategory: "LifestyleApplication",
  inLanguage: "fr", url: origin + "/", description: home.description, downloadUrl: origin + downloadPath,
  image: origin + "/partage/spawt.jpg", offers: { "@type": "Offer", price: "0", priceCurrency: "XOF" },
};
export function metaTags(page: PageMeta) {
  const image = origin + "/partage/" + (page.image ?? "spawt") + ".jpg";
  const alt = page.alt ?? home.alt!;
  return {
    name: {
      description: page.description, robots: page.noindex ? "noindex, nofollow, noarchive" : "index, follow, max-image-preview:large",
      "twitter:card": "summary_large_image", "twitter:title": page.title, "twitter:description": page.description, "twitter:image": image, "twitter:image:alt": alt,
    },
    property: {
      "og:type": "website", "og:site_name": "SPAWT", "og:locale": "fr_CI", "og:title": page.title, "og:description": page.description,
      ...(page.path ? { "og:url": origin + page.path } : {}), "og:image": image, "og:image:type": "image/jpeg",
      "og:image:width": "1200", "og:image:height": "630", "og:image:alt": alt,
    },
  };
}
