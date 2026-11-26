import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import backend from "./public-backend.json";

const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
export const validResumeToken = (value: unknown): value is string => typeof value === "string" && uuid.test(value);
const storageKey = "spawt.pilote.visite.v1";
const week = 7 * 24 * 60 * 60 * 1000;
type Entry = { source: "facebook" | "instagram" | "unknown"; campaign: string; creative: string; medium: string };
type Receipt = { token: string; code: string; expires: number };
type DownloadReceipt = { build:number; bytes:number };
type Visit = { key: string; entry: Entry; started: number; clicked: boolean; receipt?: Receipt; completed?: DownloadReceipt };

export function campaignEntry(search: string): Entry {
  const params = new URLSearchParams(search);
  const source = params.get("utm_source");
  if ((source === "facebook" || source === "instagram") && params.get("utm_medium") === "paid_social"
    && params.get("utm_campaign") === "abidjan_beta_20261204" && params.get("utm_content") === "pancakes_v2") {
    return { source, campaign: "abidjan_beta_20261204", creative: "pancakes_v2", medium: "paid_social" };
  }
  return { source: "unknown", campaign: "", medium: "", creative: "" };
}

function store(visit: Visit) {
  try { sessionStorage.setItem(storageKey, JSON.stringify(visit)); } catch { /* Restricted in-app storage. */ }
}

function visitKey(): string {
  // Some embedded browsers expose getRandomValues, but restrict randomUUID to HTTPS.
  try {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    const bytes = globalThis.crypto?.getRandomValues(new Uint8Array(16));
    if (!bytes) return "";
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
    return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
  } catch { return ""; }
}

function validReceipt(receipt: Receipt) {
  return validResumeToken(receipt.token) && typeof receipt.code === "string" && /^[A-F0-9]{12}$/.test(receipt.code)
    && Number.isFinite(receipt.expires) && receipt.expires > Date.now();
}

function createVisit(entry: Entry): Visit {
  try {
    const old = JSON.parse(sessionStorage.getItem(storageKey) || "null") as Visit | null;
    if (old && uuid.test(old.key) && old.entry?.source === entry.source && typeof old.clicked === "boolean"
      && typeof old.started === "number" && old.started <= Date.now() && old.started + week > Date.now()
      && (!old.receipt || (old.clicked && validReceipt(old.receipt)))) return { ...old, entry };
  } catch { /* Start afresh if the browser cannot restore the tab. */ }
  const visit = { key: visitKey(), started: Date.now(), entry, clicked: false };
  store(visit);
  return visit;
}

async function pilotRequest(name:string, params:Record<string, unknown>, signal: AbortSignal) {
  const local = import.meta.env.DEV && import.meta.env.VITE_PILOT_LOCAL_API === "1";
  const endpoint = local ? "/pilot-api" : backend.url + "/rest/v1";
  const headers: Record<string,string> = {"Content-Type":"application/json"};
  if (!local) { headers.apikey=backend.anonKey; headers.Authorization="Bearer "+backend.anonKey; }
  return fetch(endpoint+"/rpc/"+name,{method:"POST",headers,credentials:"omit",referrerPolicy:"no-referrer",cache:"no-store",signal,body:JSON.stringify(params)});
}

async function touch(visit: Visit, action: "arrival" | "download_click", signal: AbortSignal) {
  const response = await pilotRequest("pilot_campaign_touch", {
    p_visit_key:visit.key,p_action:action,p_source:visit.entry.source,p_medium:visit.entry.medium,
    p_campaign:visit.entry.campaign,p_creative:visit.entry.creative,
  },signal);
  if (!response.ok) throw new Error("Le suivi du parcours est indisponible.");
  return response.json();
}

async function flushApkReceipt(visit: Visit) {
  const item=visit.completed;
  if (!item || !visit.receipt || !validReceipt(visit.receipt)) return;
  const control=new AbortController();
  const timeout=window.setTimeout(()=>control.abort(),10_000);
  try {
    const result=await pilotRequest("pilot_download_received", {
      p_visit_key:visit.key,p_build:item.build,p_bytes:item.bytes,
    },control.signal);
    if (result.ok && visit.completed===item) { delete visit.completed; store(visit); }
  } catch { /* retry on reopening or recovering network */ }
  finally { clearTimeout(timeout); }
}

export function usePilotJourney(search: string) {
  const entry = useMemo(() => campaignEntry(search), [search]);
  const visit = useMemo(() => createVisit(entry), [entry]);
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const [errorVisit, setErrorVisit] = useState<Visit | null>(null);
  const [openVisit, setOpenVisit] = useState<Visit | null>(null);
  const setShowResume = (open: boolean) => setOpenVisit(open ? visit : null);
  const request = useRef<AbortController | null>(null);

  const issue = useCallback(async () => {
    if (visit.receipt && visit.receipt.expires > Date.now()) { void flushApkReceipt(visit); return; }
    if (request.current || !visit.clicked) return;
    if (!visit.key) { setErrorVisit(visit); return; }
    const controller = new AbortController();
    request.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 10000);
    setErrorVisit(null);
    try {
      const data = await touch(visit, "download_click", controller.signal);
      if (controller.signal.aborted || request.current !== controller) return;
      const expires = Date.parse(data.expires_at);
      const receipt = { token: data.resume_token, code: data.resume_code, expires };
      if (!validReceipt(receipt)) throw new Error();
      visit.receipt = receipt;
      store(visit);
      void flushApkReceipt(visit);
      refresh();
    } catch { if (request.current === controller) setErrorVisit(visit); }
    finally { clearTimeout(timer); if (request.current === controller) request.current = null; }
  }, [visit]);

  useEffect(() => {
    const arrival = new AbortController();
    function restore() {
      if (visit.clicked) void issue();
      else if (visit.key) void touch(visit, "arrival", arrival.signal).catch(() => {});
    }
    restore();
    window.addEventListener("online", restore);
    return () => { window.removeEventListener("online", restore); arrival.abort(); request.current?.abort(); request.current = null; };
  }, [visit, issue]);

  function startDownload() {
    visit.clicked = true; store(visit);
    setShowResume(true);
    void issue();
  }
  function reportApkReceived(build:number,bytes:number) {
    visit.completed={build,bytes};store(visit);
    void issue();
  }
  return { reportApkReceived, entry: visit.entry, receipt: visit.receipt, error: errorVisit === visit, clicked: visit.clicked,
    showResume: openVisit === visit, setShowResume, issue, startDownload };
}
