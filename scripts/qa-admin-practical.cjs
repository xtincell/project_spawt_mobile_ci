const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright-core");

(async () => {
  const origin = "https://admin.spawt.online";
  const edit = "/lieux/edit/c5acfd12-01dd-5cd3-9beb-0531d89c3e99";
  const paths = [edit, "/envies", "/menus", "/pilote", "/login", "/mot-de-passe-oublie", "/reinitialiser"];
  const bundles = await Promise.all(paths.map(async path => {
    const response = await fetch(origin + path, { signal: AbortSignal.timeout(50000) });
    assert.equal(response.status, 200);
    return (await response.text()).match(/src="(\/assets\/index-[^"]+\.js)"/)[1];
  }));
  assert.equal(new Set(bundles).size, 1);
  const js = await (await fetch(origin + bundles[0])).text();
  const features = ["save_place_practical", "place_practical_profiles", "Informations pratiques sourcées", "admin_saved_catalogue", "admin_pilot_funnel", "/reinitialiser"];
  for (const feature of features) assert.ok(js.includes(feature), feature);
  const executablePath = process.env.CHROME_BIN || "/usr/bin/google-chrome";
  const browser = await chromium.launch({ executablePath, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    await page.goto(origin+edit, {waitUntil:"domcontentloaded", timeout:90000});
    await page.waitForURL("**/login*", {timeout:60000});
    const receipt = { verifiedAt:new Date().toISOString(), origin, bundle:bundles[0], publicPaths:paths, compiledFeatures:features, unauthenticatedPlaceEdit:page.url() };
    fs.writeFileSync("validation-console.json", JSON.stringify(receipt,null,2));
    console.log(JSON.stringify(receipt));
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
