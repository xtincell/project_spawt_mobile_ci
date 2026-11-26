import type { AndroidRelease } from "./android-release";

export async function receiveApk(release: AndroidRelease, signal: AbortSignal): Promise<Blob> {
  const url = new URL(release.url,location.origin);
  if (url.origin !== location.origin || !/^\/(?:downloads|pilot-delivery)\//.test(url.pathname)) throw new Error("untracked mirror");
  const response = await fetch(url,{ signal, credentials:"omit", redirect:"error", referrerPolicy:"no-referrer" });
  if (response.status !== 200 || response.headers.get("content-type")?.split(";")[0] !== "application/vnd.android.package-archive"
    || Number(response.headers.get("content-length")) !== release.bytes) throw new Error("unverified response");
  const blob = await response.blob();
  if (signal.aborted || blob.size !== release.bytes) throw new Error("incomplete transfer");
  const magic = new Uint8Array(await blob.slice(0,4).arrayBuffer());
  if (magic.join(",") !== "80,75,3,4") throw new Error("unexpected content");
  return blob;
}
