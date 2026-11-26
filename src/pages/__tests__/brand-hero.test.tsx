import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import pinnedRelease from "../../../scripts/android-release.json";
import { ANDROID_CHANNEL_URL } from "../../lib/android-release";
import { PublicBrandProvider } from "../../lib/public-brand";
import { BrandHero } from "../proposals/BrandHero";
import { ShowcaseHero } from "../proposals/DirectionC";
import App from "../../App";

const nextBuild = pinnedRelease.build + 1;
const nextFileName = `spawt-1.1.2-build${nextBuild}.apk`;
const nextDownloadUrl = `https://github.com/xtincell/spawt-ci-mobile-v1-mvp/releases/download/local-build-android-2026-10-29-${nextBuild}/${nextFileName}`;
const mirror = "/downloads/" + nextFileName;
const nextRelease = {
  ...pinnedRelease,
  schemaVersion: 1,
  packageName: "com.upgraders.spawt",
  version: "1.1.2",
  build: nextBuild,
  buildDate: "2026-10-29",
  fileName: nextFileName,
  url: nextDownloadUrl,
};

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, options?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === mirror && options?.method === "HEAD") return new Response(null, {headers:{
      "Content-Type":"application/vnd.android.package-archive", "Content-Length":String(nextRelease.bytes), "Accept-Ranges":"bytes",
    }});
    if (url === mirror + ".sha256") return new Response(nextRelease.sha256 + "  " + nextFileName + "\n");
    return url === ANDROID_CHANNEL_URL
      ? new Response(JSON.stringify(nextRelease), {status: 200})
      : new Response("", {status: 503});
  }));
});

afterEach(() => { vi.unstubAllGlobals(); });

function renderHero(variant: "warm" | "dark") {
  return render(<MemoryRouter><PublicBrandProvider><BrandHero variant={variant} /></PublicBrandProvider></MemoryRouter>);
}

function expectCurrentVisual(carousel: HTMLElement, name: string) {
  for (const label of ["Moka", "À table", "Le Palais"]) {
    expect(within(carousel).getByRole("button", {name: `Afficher : ${label}`}))
      .toHaveAttribute("aria-pressed", String(label === name));
  }
}

function expectDownloadAvailable() {
  const download = screen.getByRole("link", {name: /Télécharger SPAWT pour Android/i});
  expect(download).toBeVisible();
  expect(new URL((download as HTMLAnchorElement).href).pathname).toBe(mirror);
  expect(download).toHaveAttribute("download", nextFileName);
}

describe("BrandHero — découverte sans perdre le téléchargement", () => {
  it("relie les trois repères d’accueil aux bonnes fiches et à la même release Android", async () => {
    window.history.replaceState({}, "", "/");
    render(<App />);
    const hero = within(await screen.findByRole("region", { name: "Les spawts d’Abidjan" }));
    expect(hero.getByRole("heading", { level: 1, name: /ce soir, on mange où/i })).toBeVisible();
    expect(hero.getByRole("button", { name: "Afficher Villa le Prisé", pressed: true })).toBeVisible();
    expect(hero.getByRole("link", { name: "Voir la fiche de Villa le Prisé" })).toHaveAttribute("href", "/carte?lieu=5fc3912f-d79a-5b6c-b263-2bfbaf2d820e");

    function checkDownloads() {
      const downloads = screen.getAllByRole("link", { name: "Télécharger SPAWT" });
      expect(downloads).toHaveLength(2);
      expect(hero.getByRole("link", { name: "Télécharger SPAWT" })).toBe(downloads[0]);
      for (const download of downloads) {
        expect(download).toBeVisible();
        expect(new URL((download as HTMLAnchorElement).href).pathname).toBe(mirror);
        expect(download).toHaveAttribute("download", nextFileName);
      }
    }
    await waitFor(checkDownloads);
    for (const [name, title, id] of [
      ["Azito Palmeraie", "Une envie de braisé ?", "846cbab9-1ecf-5ba4-9927-99efa5e5c5ba"],
      ["IN’ Concept Store", "Envie d’un brunch ?", "c5acfd12-01dd-5cd3-9beb-0531d89c3e99"]
    ]) {
      fireEvent.click(hero.getByRole("button", {name: "Afficher " + name}));
      expect(hero.getByRole("button", {name: "Afficher " + name, pressed:true})).toBeVisible();
      expect(hero.getByRole("heading", {level: 1, name: title})).toBeVisible();
      expect(hero.getByRole("link", {name: "Voir la fiche de " + name})).toHaveAttribute("href", "/carte?lieu=" + id);
      checkDownloads();
    }

    const legal = within(screen.getByRole("contentinfo"));
    expect(legal.getByRole("link", { name: "Supprimer mon compte" })).toHaveAttribute("href", "/legal/suppression-compte");
    expect(legal.getByRole("link", { name: "Confidentialité" })).toHaveAttribute("href", "/legal/confidentialite");
    expect(screen.queryByRole("link", { name: /app store|google play/i })).not.toBeInTheDocument();
  });
  it("ouvre la nouvelle composition sur la photo et garde la version Android courante pendant la navigation", async () => {
    render(<MemoryRouter><PublicBrandProvider><ShowcaseHero /></PublicBrandProvider></MemoryRouter>);
    const carousel = screen.getByRole("region", {name: "L’univers SPAWT"});
    await waitFor(expectDownloadAvailable);
    expectCurrentVisual(carousel, "À table");
    fireEvent.click(within(carousel).getByRole("button", {name: "Visuel suivant"}));
    expectCurrentVisual(carousel, "Moka");
    fireEvent.keyDown(carousel, {key: "ArrowRight"});
    expectCurrentVisual(carousel, "Le Palais");
    expectDownloadAvailable();
    fireEvent.click(within(carousel).getByRole("button", {name: "Visuel suivant"}));
    expectCurrentVisual(carousel, "À table");
    expectDownloadAvailable();
  });
  it.each(["warm", "dark"] as const)("garde l’APK courant accessible pendant toute la navigation dans la variante %s", async variant => {
    renderHero(variant);
    const carousel = screen.getByRole("region", {name: "L’univers SPAWT"});
    expect(carousel).toHaveAttribute("aria-roledescription", "carrousel");
    await waitFor(expectDownloadAvailable);
    expectCurrentVisual(carousel, "Moka");

    fireEvent.click(within(carousel).getByRole("button", {name: "Visuel précédent"}));
    expectCurrentVisual(carousel, "Le Palais");
    expectDownloadAvailable();

    for (const visual of ["Moka", "À table", "Le Palais", "Moka"]) {
      fireEvent.click(within(carousel).getByRole("button", {name: "Visuel suivant"}));
      expectCurrentVisual(carousel, visual);
      expectDownloadAvailable();
    }

    fireEvent.click(within(carousel).getByRole("button", {name: "Afficher : À table"}));
    expectCurrentVisual(carousel, "À table");
    expectDownloadAvailable();
  });

  it("permet de parcourir les trois visuels au clavier et de revenir au dernier", async () => {
    renderHero("warm");
    const carousel = screen.getByRole("region", {name: "L’univers SPAWT"});
    const selector = within(carousel).getByRole("button", {name: "Afficher : Moka"});
    await waitFor(expectDownloadAvailable);
    selector.focus();
    expect(selector).toHaveFocus();

    for (const [key, visual] of [
      ["ArrowRight", "À table"],
      ["ArrowRight", "Le Palais"],
      ["ArrowRight", "Moka"],
      ["ArrowLeft", "Le Palais"],
    ]) {
      fireEvent.keyDown(selector, {key});
      expectCurrentVisual(carousel, visual);
      expectDownloadAvailable();
    }
  });
});
