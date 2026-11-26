import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../App";
import { FALLBACK_ANDROID_RELEASE } from "../lib/android-release";
import { validResumeToken } from "../lib/pilot-journey";

const token = "233af3e8-a4cf-4522-a452-1fad03e45cf5";
const code = "AB101EF00CA3";
const campaign = (source: string) => "/?utm_source=" + source + "&utm_medium=paid_social&utm_campaign=abidjan_beta_20261204&utm_content=pancakes_v2#telecharger";
const actions: { p_visit_key: string; p_action: string; p_source: string; p_creative: string; p_campaign: string; p_medium: string }[] = [];
let clickStatus = 200;
function renderLanding(url: string, device = "Android 14; Instagram") {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(device);
  window.history.replaceState({}, "", url);
  return render(<App />);
}
function getHero() { return within(screen.getByRole("region", { name: "Les spawts d’Abidjan" })); }

beforeEach(() => {
  actions.length = 0; clickStatus = 200;
  sessionStorage.clear();
  vi.stubGlobal("scrollTo", vi.fn());
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (!String(input).endsWith("/rpc/pilot_campaign_touch")) return new Response("", {status:503});
    const body = JSON.parse(String(init?.body));
    actions.push(body);
    if (body.p_action === "arrival") return Response.json({});
    return Response.json({resume_token: token, resume_code: code, expires_at: new Date(Date.now()+3600000).toISOString()}, {status:clickStatus});
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it.each(["facebook", "instagram"])("relie une arrivée %s au clic explicite et à une seule reprise", async source => {
  const url = campaign(source);
  const {unmount} = renderLanding(url);
  expect(getHero().getByRole("heading", {name: "Envie d’un brunch ?"})).toBeVisible();
  const cta = getHero().getByRole("link", {name:/Télécharger SPAWT/i});
  expect(cta.closest("#telecharger")).toBeTruthy();
  expect(cta).toHaveAttribute("download", FALLBACK_ANDROID_RELEASE.fileName);
  expect(cta).toHaveAttribute("href", "/downloads/" + FALLBACK_ANDROID_RELEASE.fileName);
  expect(cta.parentElement).toHaveTextContent("build " + FALLBACK_ANDROID_RELEASE.build);
  expect(cta.parentElement).toHaveTextContent(new Intl.NumberFormat("fr-FR", {maximumFractionDigits:1}).format(FALLBACK_ANDROID_RELEASE.bytes/1e6) + " Mo");
  expect(actions.map(a=>a.p_action)).toEqual(["arrival"]);
  expect(actions[0]).toMatchObject({p_source: source, p_campaign:"abidjan_beta_20261204", p_medium:"paid_social", p_creative:"pancakes_v2"});
  expect(validResumeToken(actions[0].p_visit_key)).toBe(true);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  // Keep jsdom on the landing tab, as a real APK download does.
  cta.addEventListener("click", event=>event.preventDefault());
  fireEvent.click(cta);
  fireEvent.click(cta);
  const dialog = await screen.findByRole("dialog", {name:"Après l’installation"});
  expect(await within(dialog).findByText(code)).toBeVisible();
  expect(within(dialog).getByRole("link", {name:"Ouvrir SPAWT après installation"})).toHaveAttribute("href","https://spawt.online/reprendre/"+token);
  expect(actions.map(a=>a.p_action)).toEqual(["arrival","download_click"]);
  expect(actions[1].p_visit_key).toBe(actions[0].p_visit_key);
  fireEvent.click(within(dialog).getByRole("button", {name:"Fermer"}));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  unmount();
  renderLanding(url);
  fireEvent.click(screen.getByRole("button", {name:"Retrouver mon code de reprise"}));
  expect(await within(screen.getByRole("dialog")).findByText(code)).toBeVisible();
  expect(actions).toHaveLength(2);
});

it("présente la carte web à un iPhone Instagram et garde la visite à l’étape arrivée", async () => {
  renderLanding(campaign("instagram"), "iPhone; Instagram");
  expect(getHero().getByRole("link", {name:"Explorer la carte"})).toHaveAttribute("href","/carte");
  expect(screen.queryByRole("link",{name:/Télécharger SPAWT/})).not.toBeInTheDocument();
  expect(screen.queryByRole("link",{name:/App Store|Google Play/})).not.toBeInTheDocument();
  expect(actions.map(a=>a.p_action)).toEqual(["arrival"]);
});

it("garde une source inconnue et l’APK disponible quand l’attribution est indisponible", async () => {
  clickStatus = 503;
  renderLanding("/?utm_source=facebook&utm_content=pancakes_v2#telecharger");
  expect(getHero().getByRole("heading",{name:"Ce soir, on mange où ?"})).toBeVisible();
  const cta = getHero().getByRole("link",{name:/Télécharger SPAWT/});
  cta.addEventListener("click",event=>event.preventDefault());
  fireEvent.click(cta);
  const retry = await screen.findByRole("button",{name:"Retrouver mon code"});
  expect(actions.map(a=>a.p_source)).toEqual(["unknown","unknown"]);
  clickStatus = 200;
  fireEvent.click(retry);
  expect(await screen.findByText(code)).toBeVisible();
  expect(new Set(actions.map(a=>a.p_visit_key)).size).toBe(1);
});

it("utilise des octets aléatoires sur un navigateur sans randomUUID et évite une clé faible sans crypto", async () => {
  const realCrypto = globalThis.crypto;
  vi.stubGlobal("crypto",{getRandomValues:realCrypto.getRandomValues.bind(realCrypto)});
  const first = renderLanding(campaign("facebook"));
  expect(validResumeToken(actions[0].p_visit_key)).toBe(true);
  first.unmount(); sessionStorage.clear(); actions.length=0;
  vi.stubGlobal("crypto", undefined);
  renderLanding(campaign("instagram"));
  const download = getHero().getByRole("link",{name:/Télécharger SPAWT/});
  download.addEventListener("click",event=>event.preventDefault());
  fireEvent.click(download);
  await waitFor(()=>expect(screen.getByRole("button",{name:"Retrouver mon code"})).toBeVisible());
  expect(actions).toHaveLength(0);
});
