const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const { execFileSync } = require("node:child_process");
const { chromium, devices } = require("playwright-core");
const { JSDOM } = require("jsdom");

const origin = "https://spawt.online";
const commit = process.env.WEB_TARGET;
assert.match(commit, /^[a-f0-9]{40}$/);
const fromGit = path => execFileSync("git", ["show", commit + ":" + path], {maxBuffer: 20 * 1024 * 1024});
const release = JSON.parse(fromGit("scripts/android-release.json"));
const sum = bytes => crypto.createHash("sha256").update(bytes).digest("hex");
const receipt = { utc: new Date().toISOString(), origin, commit, build: release.build, indexable: [], screenshots: [], blocked: [] };
function parse(html) { return new JSDOM(html).window.document; }

async function get(url, options) {
  const response = await fetch(new URL(url, origin), { signal: AbortSignal.timeout(90000), ...options });
  assert.equal(response.status, 200, String(url));
  return response;
}
async function checkSEO() {
  const map = new JSDOM(await (await get("/sitemap.xml")).text(), {contentType:"application/xml"});
  const urls = [...map.window.document.querySelectorAll("loc")].map(n => n.textContent);
  assert.equal(new Set(urls).size, 9);
  const images = new Set();
  for (const url of urls) {
    const response = await get(url);
    const d = parse(await response.text());
    assert.equal(d.querySelector("link[rel=canonical]")?.getAttribute("href"), url);
    assert.equal(d.querySelector("meta[property='og:url']")?.content, url);
    assert.match(d.querySelector("meta[name='robots']")?.content, /^index,/);
    assert.doesNotMatch(response.headers.get("x-robots-tag") || "", /noindex/i);
    assert.ok(d.querySelector("#root h1")?.textContent.trim());
    assert.ok(d.querySelector("meta[name='description']")?.content.trim());
    assert.match(d.title, /SPAWT/);
    const og = d.querySelector("meta[property='og:image']")?.content;
    assert.equal(og, d.querySelector("meta[name='twitter:image']")?.content);
    images.add(og);
    receipt.indexable.push({url, title:d.title});
  }
  assert.equal(images.size, 4);
  for (const url of images) {
    const data = Buffer.from(await (await get(url)).arrayBuffer());
    const frame = data.indexOf(Buffer.from([0xff,0xc0]));
    assert.ok(frame >= 0);
    assert.equal(data.readUInt16BE(frame+5),630);
    assert.equal(data.readUInt16BE(frame+7),1200);
  }
  const resume = await get("/reprendre/00000000-0000-4000-8000-000000000000");
  assert.match(resume.headers.get("cache-control") || "", /no-store/);
  assert.match(parse(await resume.text()).querySelector("meta[name='robots']").content, /noindex/);
  const missing = await fetch(origin + "/recette-page-absente-spawt");
  assert.equal(missing.status,404);
  assert.match(parse(await missing.text()).querySelector("meta[name='robots']").content,/noindex/);
  assert.ok((await (await get("/robots.txt")).text()).includes("Sitemap: " + origin + "/sitemap.xml"));
  assert.ok((await (await get("/.well-known/assetlinks.json")).json()).some(p => p.target.package_name === "com.upgraders.spawt"));
  receipt.socialImages = images.size;
}
async function checkNativeScreens() {
  for (const file of ["app-carte-explorer.webp","app-fiche-le-cha.webp","app-envies-enregistrees.webp"]) {
    const url = "/brand/accueil/" + file;
    const response = await get(url);
    assert.match(response.headers.get("content-type"), /image\/webp/);
    const data = Buffer.from(await response.arrayBuffer());
    const digest = sum(data);
    assert.equal(digest, sum(fromGit("public" + url)));
    receipt.screenshots.push({file, bytes:data.length, sha256:digest});
  }
}
async function checkFirstClick() {
  const browser = await chromium.launch({executablePath: "/usr/bin/google-chrome"});
  try {
    const context = await browser.newContext({...devices["Pixel 7"], acceptDownloads:true, serviceWorkers:"block"});
    const blocked = new Set();
    await context.route("**/*", route => {
      const q=route.request(),url = new URL(q.url());
      if (!["GET","HEAD","OPTIONS"].includes(q.method()) || url.pathname.endsWith("/android-releases/latest.json")) {
        blocked.add(url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    const page=await context.newPage();
    assert.equal((await page.goto(origin,{waitUntil:"domcontentloaded"})).status(),200);
    const a=page.locator("#telecharger a[download]").first();
    await a.waitFor();
    const filename=await a.getAttribute("download");
    assert.equal(filename,release.fileName);
    const label=(await a.locator("..").innerText()).trim();
    assert.ok(label.includes("build "+release.build));
    assert.ok(label.includes(release.version));
    const href = "/downloads/"+filename;
    assert.equal(await a.getAttribute("href"),href);
    const [download, payload] = await Promise.all([
      page.waitForEvent("download",{timeout:180000}),
      page.waitForResponse(response => response.url() === origin+href && response.status() === 200,{timeout:120000}),
      a.click(),
    ]);
    assert.equal(download.suggestedFilename(),filename);
    const downloadedFrom = download.url();
    assert.ok(downloadedFrom === origin+href || downloadedFrom.startsWith("blob:"+origin+"/"));
    assert.equal(Number(await payload.headerValue("content-length")),release.bytes);
    assert.equal(await download.failure(),null);
    const path=await download.path();
    const hash=crypto.createHash("sha256");
    for await (const chunk of fs.createReadStream(path)) hash.update(chunk);
    const bytes=fs.statSync(path).size,sha256=hash.digest("hex");
    assert.equal(bytes,release.bytes);
    assert.equal(sha256,release.sha256);
    const alias=await fetch(origin+"/downloads/spawt-latest.apk",{redirect:"manual"});
    assert.ok([302,307].includes(alias.status));
    assert.equal(new URL(alias.headers.get("location"),origin).href,origin+href);
    receipt.firstClick={url:payload.url(),delivery:downloadedFrom.startsWith("blob:")?"browser-file-after-GET":"direct",filename,label,bytes,sha256,manifestBlocked:true};
    receipt.blocked=[...blocked];
    receipt.networkPostsSent=0;
  } finally { await browser.close(); }
}
(async () => {
  await Promise.all([checkSEO(),checkNativeScreens(),checkFirstClick()]);
  fs.writeFileSync("validation-vitrine.json",JSON.stringify(receipt,null,2) + "\n");
  console.log(JSON.stringify({commit,build:release.build,pages:receipt.indexable.length,screens:receipt.screenshots.length,firstClick:receipt.firstClick}));
})().catch(err => {console.error(err);process.exitCode=1});
