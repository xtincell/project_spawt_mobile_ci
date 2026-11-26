// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { receiveApk } from "../lib/apk-receipt";
const release={version:"1.1.5",build:46,sha256:"",sourceCommit:"",bytes:8,fileName:"spawt.apk",url:"/downloads/spawt.apk"};
const ok=()=>new Response(Uint8Array.from([80,75,3,4,0,0,0,0]),{headers:{"content-type":"application/vnd.android.package-archive","content-length":"8"}});
afterEach(()=>{ vi.unstubAllGlobals(); });
it("confirms a complete APK body on the local mirror",async()=>{
 vi.stubGlobal("location",{origin:"https://spawt.online"});vi.stubGlobal("fetch",vi.fn().mockResolvedValue(ok()));
 expect((await receiveApk(release,new AbortController().signal)).size).toBe(8);
});
it("rejects a truncated body even with the expected header",async()=>{
 vi.stubGlobal("location",{origin:"https://spawt.online"});
 vi.stubGlobal("fetch",vi.fn().mockResolvedValue(new Response(Uint8Array.from([80,75,3,4]),{headers:{"content-type":"application/vnd.android.package-archive","content-length":"8"}})));
 await expect(receiveApk(release,new AbortController().signal)).rejects.toThrow("incomplete transfer");
});
it("verifies transferred bytes when the edge omits the length header",async()=>{
 vi.stubGlobal("location",{origin:"https://spawt.online"});
 const bytes=Uint8Array.from([80,75,3,4,0,0,0,0]);
 const headers={"content-type":"application/vnd.android.package-archive"};
 vi.stubGlobal("fetch",vi.fn().mockResolvedValueOnce(new Response(bytes,{headers}))
   .mockResolvedValueOnce(new Response(bytes.slice(0,4),{headers})));
 expect((await receiveApk(release,new AbortController().signal)).size).toBe(8);
 await expect(receiveApk(release,new AbortController().signal)).rejects.toThrow("incomplete transfer");
});
it("never claims an external download",async()=>{
 vi.stubGlobal("location",{origin:"https://spawt.online"});const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
 await expect(receiveApk({...release,url:"https://example.com/spawt.apk"},new AbortController().signal)).rejects.toThrow("untracked mirror");
 expect(fetch).not.toHaveBeenCalled();
});

it.each([
  ["identity length contradicts the manifest", { "content-length": "4" }, 200, "unverified response"],
  ["declared length is not a number", { "content-length": "unknown" }, 200, "unverified response"],
  ["partial response", {}, 206, "unverified response"],
  ["unexpected media type", { "content-type": "text/html" }, 200, "unverified response"],
] as const)("rejects %s even if the body looks complete", async (_case, headers, status, error) => {
  vi.stubGlobal("location", { origin: "https://spawt.online" });
  const response = new Response(Uint8Array.from([80,75,3,4,0,0,0,0]), {
    status, headers: { "content-type": "application/vnd.android.package-archive", ...headers },
  });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  await expect(receiveApk(release, new AbortController().signal)).rejects.toThrow(error);
});

it("measures decoded bytes when the declared length describes compressed transport", async () => {
  vi.stubGlobal("location", { origin: "https://spawt.online" });
  const headers = { "content-type": "application/vnd.android.package-archive", "content-encoding": "zstd", "content-length": "6" };
  const body = Uint8Array.from([80,75,3,4,0,0,0,0]);
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce(new Response(body, { headers }))
    .mockResolvedValueOnce(new Response(body.slice(0,6), { headers }))
    .mockResolvedValueOnce(new Response(new Uint8Array(8), { headers })));
  const signal = new AbortController().signal;
  expect((await receiveApk(release, signal)).size).toBe(release.bytes);
  await expect(receiveApk(release, signal)).rejects.toThrow("incomplete transfer");
  await expect(receiveApk(release, signal)).rejects.toThrow("unexpected content");
});
