import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { JSDOM } from "jsdom";

const text = path => readFile("dist/" + path, "utf8");
const origin = "https://spawt.online";
const sitemap = new JSDOM(await text("sitemap.xml"), { contentType: "application/xml" }).window.document;
const urls = Array.from(sitemap.querySelectorAll("loc"), node => node.textContent);
assert.equal(new Set(urls).size, 9);
const images = new Set();
for (const url of urls) {
  const target = new URL(url);
  assert.equal(target.origin, origin);
  assert.equal(target.search + target.hash, "");
  const path = target.pathname;
  const doc = new JSDOM(await text(path === "/" ? "index.html" : path.slice(1) + ".html")).window.document;
  assert.equal(doc.querySelector("link[rel=canonical]")?.href, url);
  assert.equal(doc.querySelector("meta[property='og:url']")?.content, url);
  assert.equal(doc.querySelectorAll("title").length, 1);
  assert.match(doc.title, /SPAWT/);
  assert.equal(doc.querySelectorAll("meta[name=description]").length, 1);
  assert.match(doc.querySelector("meta[name=robots]")?.content, /^index,/);
  assert.ok(doc.querySelector("#root h1")?.textContent.trim());
  assert.ok(doc.querySelectorAll("#root a[href]").length > 0);
  const share = doc.querySelector("meta[property='og:image']")?.content;
  assert.equal(doc.querySelector('meta[name="twitter:image"]')?.content, share);
  const picture = await readFile("dist/" + new URL(share).pathname.slice(1));
  const marker = picture.indexOf(Buffer.from([255,192]));
  assert.ok(marker >= 0);
  assert.equal(picture.readUInt16BE(marker + 5), 630);
  assert.equal(picture.readUInt16BE(marker + 7), 1200);
  images.add(share);
  if (path === "/") {
    assert.ok(doc.querySelector('#root a[href="/downloads/spawt-latest.apk"]'));
    assert.equal(JSON.parse(doc.querySelector('script[type="application/ld+json"]').textContent)["@type"], "SoftwareApplication");
  }
}
assert.equal(images.size, 4);
for (const path of ["reprise.html", "404.html", "statut.html"]) {
  const doc = new JSDOM(await text(path)).window.document;
  assert.match(doc.querySelector("meta[name=robots]")?.content, /noindex/);
  assert.equal(doc.querySelector("link[rel=canonical]"), null);
}
for (const [filename, size] of [["favicon-48.png",48], ["favicon-192.png",192], ["apple-touch-icon.png",180]]) {
  const png = await readFile("dist/" + filename);
  assert.equal(png.readUInt32BE(16), size);assert.equal(png.readUInt32BE(20), size);
}
assert.ok((await readFile("dist/favicon.ico")).readUInt16LE(4) >= 3);
assert.ok((await text("robots.txt")).includes("Sitemap: " + origin + "/sitemap.xml"));
assert.ok(JSON.parse(await text(".well-known/assetlinks.json")).length);
console.log("SEO · 9 URL indexables, 4 images de partage 1200×630, 3 pages privées/erreur et icônes vérifiées.");
