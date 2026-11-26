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
it("never claims an external download",async()=>{
 vi.stubGlobal("location",{origin:"https://spawt.online"});const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
 await expect(receiveApk({...release,url:"https://example.com/spawt.apk"},new AbortController().signal)).rejects.toThrow("untracked mirror");
 expect(fetch).not.toHaveBeenCalled();
});
