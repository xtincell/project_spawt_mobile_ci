const photos = {
  hero: { caption: "À table, à Abidjan", author: "Likikouet Raïssa", url: "https://commons.wikimedia.org/wiki/File:Sole_brais%C3%A9_et_atti%C3%A9k%C3%A9.jpg" },
  detail: { caption: "Alloco & claco, Côte d’Ivoire", author: "BorisAhonon", url: "https://commons.wikimedia.org/wiki/File:Alloco_%26_claco_ivoirien_01.jpg" },
};
export function PhotoCredit({ photo }: { photo: keyof typeof photos }) {
  const item = photos[photo];
  return <figcaption className="photo-credit">{item.caption} · <a href={item.url} target="_blank" rel="noreferrer">Photo : {item.author}</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a> · Recadrage d’affichage.</figcaption>;
}
