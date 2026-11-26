import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createServer } from "vite";

const server = await createServer({ configFile: false, mode: "production", server: { middlewareMode: true, hmr: false }, appType: "custom", optimizeDeps: { noDiscovery: true }, esbuild: { jsx: "automatic" } });
try {
  const { renderPage, indexed } = await server.ssrLoadModule("/scripts/seo-prerender.tsx");
  const template = await readFile("dist/index.html", "utf8");
  for (const route of [...indexed, "/trouvailles/le-cha", "/statut", "/reprendre/exemple", "/404"]) {
    const { head, body } = renderPage(route);
    const file = join("dist", route === "/" ? "index.html" : route.startsWith("/reprendre/") ? "reprise.html" : route.slice(1) + ".html");
    await mkdir(dirname(file), { recursive: true });
    const html = template.replace(/<!-- SEO_START -->[\s\S]*?<!-- SEO_END -->/, () => head)
      .replace('<div id="root"></div>', () => '<div id="root">' + body + '</div>');
    await writeFile(file, html);
  }
  const sitemap = indexed.map(path => "  <url><loc>https://spawt.online" + path + "</loc></url>").join("\n");
  await writeFile("dist/sitemap.xml", '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + sitemap + '\n</urlset>\n');
} finally {
  await server.close();
}
