import { useEffect } from "react";
import { useLocation } from "react-router";
import { metaTags, origin, pageMeta, softwareApplication } from "../lib/seo";

export function PageMetadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const page = pageMeta(pathname);
    document.title = page.title;
    document.head.querySelectorAll("[data-spawt-seo]").forEach(node => node.remove());
    const add = (name: string, attributes: Record<string, string>) => {
      const element = document.createElement(name);
      element.setAttribute("data-spawt-seo", "");
      for (const [key, val] of Object.entries(attributes)) element.setAttribute(key, val);
      document.head.append(element);
      return element;
    };
    for (const [attr, tags] of Object.entries(metaTags(page))) {
      for (const [key, content] of Object.entries(tags)) if (content) add("meta", { [attr]: key, content });
    }
    if (page.path) add("link", { rel: "canonical", href: origin + page.path });
    if (page.path === "/") add("script", { type: "application/ld+json" }).textContent = JSON.stringify(softwareApplication);
  }, [pathname]);
  return null;
}
