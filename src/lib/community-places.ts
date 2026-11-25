import leCha from "./le-cha-review.json";

type Photo = { src: string; alt: string; credit: string; source?: string; caption?: string; venueSource?: string };
type Highlight = { icon: string; label: string };
export type CommunityPlace = {
  slug: string; id: string; name: string; address: string; specialty: string;
  meal: Photo; front: Photo; setting?: Photo; reviewer: string; title: string; score: number;
  highlights: Highlight[]; comment: string; sourceLabel: string; sourceUrl?: string;
  ratings?: { label: string; value: number }[]; reactions: string[];
};

export const communityPlaces: CommunityPlace[] = [
  {
    slug: "le-cha", id: leCha.placeId, name: leCha.name, address: "Marcory · Abidjan", specialty: "Asian coffee house",
    meal: { src: "lecha-table-960.webp", alt: leCha.photoAlt, credit: "Photo de la visite" },
    front: { src: "le-cha-devanture.webp", alt: leCha.frontAlt, credit: "Devanture fournie à SPAWT" },
    reviewer: "Un membre de la Bande", title: "Touriste", score: 4,
    highlights: [{icon: "plats", label: "Goût original"}, {icon: "etablissement", label: "Déco appréciée"}],
    comment: leCha.quote, sourceLabel: "Témoignage confié à SPAWT", ratings: leCha.ratings,
    reactions: ["C’était quoi, les petites bouchées à partager ?", "Je note l’adresse pour la déco."],
  },
  {
    slug: "kaiten", id: "a1000000-0000-4000-8000-000000000001", name: "Kaiten",
    address: "Rue du Docteur Blanchard · Zone 4, Marcory", specialty: "Sushi & more",
    meal: { src: "kaiten-nigiri.webp", alt: "Gros plan sur un nigiri servi chez Kaiten.", credit: "Kaiten · galerie SPAWT", source: "https://api.spawt.online/storage/v1/object/public/place-covers/places/a1000000-0000-4000-8000-000000000001/official-20261009-8a6f300bdb3a139c.jpg" },
    front: { src: "kaiten-enseigne.webp", alt: "L’enseigne du Kaiten.", credit: "Kaiten", source: "https://www.kaiten.ci/fr/menu" },
    reviewer: "Un membre de la Bande", title: "Touriste", score: 5,
    highlights: [{icon: "plats", label: "Sushis appréciés"}, {icon: "menu", label: "Menu du midi"}],
    comment: "Le doyen du japonais à Abidjan, et ça se sent. Sushi et carpaccio au niveau. Le menu lunch du midi est le meilleur rapport de la ville.",
    sourceLabel: "Avis de terrain SPAWT", reactions: ["Team sushi ou team carpaccio ?", "Le menu du midi me tente pour une prochaine pause."],
  },
  {
    slug: "dipndip", id: "85433084-a972-563c-b9d1-6fac34f776d9", name: "DipnDip",
    address: "Prima Center · Zone 4, Marcory", specialty: "Desserts au chocolat",
    meal: { src: "dipndip-crepe-illustration.webp", alt: "Crêpe nappée de chocolat et garnie de fraises, photographiée à Londres.", caption: "Crêpe chocolat-fraises · illustration, Londres", credit: "Amanda Slater · CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:La_Petite_Bretagne.jpg", venueSource: "https://www.instagram.com/p/DgABPJIg3hl/" },
    front: { src: "dipndip-enseigne.webp", alt: "Le logo dipndip, lettres brunes et rouges.", credit: "dipndip · Wikimedia Commons", source: "https://commons.wikimedia.org/wiki/File:Dipndip_logo.png" },
    setting: { src: "dipndip-prima-center.webp", alt: "L’entrée de la galerie Prima Center à Marcory.", credit: "Prima Center · Citizen59 · CC BY-SA 2.0", source: "https://www.flickr.com/photos/t_abdelmoumen/29916948540" },
    reviewer: "Une personne en visite", title: "Avis public", score: 4,
    highlights: [{icon: "desserts", label: "Chocolat apprécié"}, {icon: "hospitalite", label: "Service rapide"}],
    comment: "Le chocolat et le service rapide, avec le sourire, ont plu. La salle était un peu bruyante.",
    sourceLabel: "Résumé d’un avis Google du 18 mai 2023", sourceUrl: "https://wanderlog.com/place/details/3601892/dipndip-prima-center",
    reactions: ["Qui partage une crêpe au chocolat ?", "Je garde l’idée pour un goûter à Marcory."],
  },
];
