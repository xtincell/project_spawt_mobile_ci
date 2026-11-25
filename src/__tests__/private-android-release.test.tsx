import { afterEach, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import pinned from "../../scripts/android-release.json";

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.resetModules(); });

it("attend le manifeste privé à froid et retourne uniquement le candidat vérifié après une relance", async () => {
  vi.stubEnv("MODE","development");
  vi.stubEnv("VITE_PILOT_LOCAL_APK","1");
  vi.resetModules();
  let finish: (r:Response)=>void = () => {};
  const fetcher = vi.fn().mockImplementation(()=>new Promise<Response>(resolve=>{finish=resolve;}));
  vi.stubGlobal("fetch", fetcher);
  const {default: ApkDownload} = await import("../components/ApkDownload");
  const start = vi.fn();
  render(<ApkDownload onDownload={start} />);
  expect(fetcher.mock.calls[0][0]).toBe("/pilot-delivery/release.json");
  expect(screen.getByRole("status")).toHaveTextContent("Vérification");
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  expect(start).not.toHaveBeenCalled();
  await act(async()=>finish(new Response("",{status:503})));
  const retry = screen.getByRole("button", {name:"Réessayer le téléchargement"});
  expect(screen.queryByRole("link")).not.toBeInTheDocument();
  fireEvent.click(retry);
  expect(start).not.toHaveBeenCalled();
  const build = pinned.build + 2;
  const fileName = "spawt-1.1.3-build"+build+".apk";
  const url = "/pilot-delivery/"+fileName;
  await act(async()=>finish(Response.json({...pinned,schemaVersion:1,packageName:"com.upgraders.spawt",
    version:"1.1.3",build,buildDate:"2026-11-25",fileName,url})));
  await waitFor(()=>expect(screen.getByRole("link")).toHaveAttribute("href",url));
  expect(screen.getByRole("link").parentElement).toHaveTextContent("build "+build);
  expect(start).not.toHaveBeenCalled();
});
