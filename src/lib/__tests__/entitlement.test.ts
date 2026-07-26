// Tests du parsing défensif des entitlements + du poll post-paiement.
// Intervalles réels très courts (10 ms) plutôt que fake timers : plus simple
// et tout aussi déterministe pour une boucle setTimeout.
import { describe, expect, it } from "vitest";
import {
  fetchActiveEntitlements,
  isEntitlementActive,
  hasActiveGold,
  pollEntitlement,
} from "../entitlement";
import {
  makeFetchStub,
  respondQueue,
  jsonResponse,
  entitlementsEmpty,
  entitlementsActive,
} from "../../test/fetch-stub";

const FUTUR = new Date(Date.now() + 86_400_000).toISOString();
const PASSE = new Date(Date.now() - 86_400_000).toISOString();

describe("isEntitlementActive — parsing défensif", () => {
  it("une ligne sans status ni date est active (présence dans la vue = foi)", () => {
    expect(isEntitlementActive({ product: "gold" })).toBe(true);
  });

  it("status actif + échéance future → actif", () => {
    expect(isEntitlementActive({ status: "active", expires_at: FUTUR })).toBe(true);
  });

  it("status inconnu → inactif", () => {
    expect(isEntitlementActive({ status: "canceled", expires_at: FUTUR })).toBe(false);
  });

  it("échéance passée sans grâce → inactif", () => {
    expect(isEntitlementActive({ status: "active", expires_at: PASSE })).toBe(false);
  });

  it("échéance passée mais grâce en cours → actif", () => {
    expect(
      isEntitlementActive({ status: "grace", expires_at: PASSE, grace_until: FUTUR }),
    ).toBe(true);
  });

  it("tolère les noms de colonnes alternatifs (current_period_end)", () => {
    expect(isEntitlementActive({ current_period_end: PASSE })).toBe(false);
    expect(isEntitlementActive({ current_period_end: FUTUR })).toBe(true);
  });
});

describe("fetchActiveEntitlements", () => {
  it("appelle la vue REST avec le token du spawter", async () => {
    const stub = makeFetchStub([{ urlIncludes: "active_entitlements", respond: entitlementsActive }]);
    const rows = await fetchActiveEntitlements("jeton-spawter", stub.impl);
    expect(hasActiveGold(rows)).toBe(true);
    expect(stub.calls[0].url).toBe("https://test.supabase.co/rest/v1/active_entitlements?select=*");
    const headers = stub.calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer jeton-spawter");
    expect(headers.apikey).toBe("cle-anon-test");
  });
});

describe("pollEntitlement", () => {
  it("résout 'active' dès qu'une ligne active apparaît", async () => {
    const stub = makeFetchStub([
      {
        urlIncludes: "active_entitlements",
        respond: respondQueue(entitlementsEmpty, entitlementsEmpty, entitlementsActive),
      },
    ]);
    const attempts: number[] = [];
    const outcome = await pollEntitlement({
      accessToken: "jeton",
      intervalMs: 10,
      timeoutMs: 2_000,
      fetchImpl: stub.impl,
      onAttempt: (n) => attempts.push(n),
    });
    expect(outcome).toBe("active");
    expect(attempts).toEqual([1, 2, 3]);
  });

  it("résout 'timeout' si rien ne s'active dans la fenêtre", async () => {
    const stub = makeFetchStub([{ urlIncludes: "active_entitlements", respond: entitlementsEmpty }]);
    const outcome = await pollEntitlement({
      accessToken: "jeton",
      intervalMs: 10,
      timeoutMs: 60,
      fetchImpl: stub.impl,
    });
    expect(outcome).toBe("timeout");
    expect(stub.mock.mock.calls.length).toBeGreaterThan(1);
  });

  it("résout 'session_expired' sur un 401 REST", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: () => jsonResponse({ message: "JWT expired" }, 401) },
    ]);
    const outcome = await pollEntitlement({
      accessToken: "jeton-perime",
      intervalMs: 10,
      timeoutMs: 2_000,
      fetchImpl: stub.impl,
    });
    expect(outcome).toBe("session_expired");
  });

  it("avale les erreurs transitoires et réessaie", async () => {
    const stub = makeFetchStub([
      {
        urlIncludes: "active_entitlements",
        respond: respondQueue(() => jsonResponse({ message: "boom" }, 500), entitlementsActive),
      },
    ]);
    const outcome = await pollEntitlement({
      accessToken: "jeton",
      intervalMs: 10,
      timeoutMs: 2_000,
      fetchImpl: stub.impl,
    });
    expect(outcome).toBe("active");
  });
});
