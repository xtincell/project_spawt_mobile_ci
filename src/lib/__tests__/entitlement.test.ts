// Tests du parsing défensif des entitlements + du poll post-paiement.
// Intervalles réels très courts (10 ms) plutôt que fake timers : plus simple
// et tout aussi déterministe pour une boucle setTimeout.
import { describe, expect, it } from "vitest";
import {
  fetchActiveEntitlements,
  isEntitlementActive,
  isStrictlyActive,
  isFreshlyActivated,
  isB2bEntitlementRow,
  hasActiveGold,
  hasActiveB2b,
  hasFreshlyActivatedGold,
  hasFreshlyActivatedB2b,
  pollEntitlement,
} from "../entitlement";
import {
  makeFetchStub,
  respondQueue,
  jsonResponse,
  entitlementsEmpty,
  entitlementsActive,
  entitlementsGraceGold,
  b2bEntitlementsActivePro,
  b2bEntitlementsGraceGold,
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

describe("familles de plans — B2C Gold vs B2B lieux", () => {
  const goldRow = { plan: "gold_monthly", status: "active", expires_at: FUTUR };
  const proRow = { plan: "pro", status: "active", expires_at: FUTUR };
  const b2bGoldRow = { plan: "b2b_gold", status: "grace", expires_at: PASSE, grace_until: FUTUR };
  const sansPlan = { status: "active", expires_at: FUTUR };

  it("isB2bEntitlementRow : pro/b2b_gold oui, plans Gold spawter et lignes sans plan non", () => {
    expect(isB2bEntitlementRow(proRow)).toBe(true);
    expect(isB2bEntitlementRow(b2bGoldRow)).toBe(true);
    expect(isB2bEntitlementRow(goldRow)).toBe(false);
    expect(isB2bEntitlementRow(sansPlan)).toBe(false);
  });

  it("hasActiveGold ignore les lignes B2B (un compte lieu n'est pas Gold spawter)", () => {
    expect(hasActiveGold([proRow, b2bGoldRow])).toBe(false);
    expect(hasActiveGold([proRow, goldRow])).toBe(true);
    // Rétro-compat : ligne sans colonne plan = B2C (comportement historique).
    expect(hasActiveGold([sansPlan])).toBe(true);
  });

  it("hasActiveB2b ne compte que les lignes pro/b2b_gold actives (grâce incluse)", () => {
    expect(hasActiveB2b([goldRow, sansPlan])).toBe(false);
    expect(hasActiveB2b([proRow])).toBe(true);
    expect(hasActiveB2b([b2bGoldRow])).toBe(true);
    expect(hasActiveB2b([{ plan: "pro", status: "expired", expires_at: PASSE }])).toBe(false);
  });

  it("pollEntitlement accepte un prédicat : hasActiveB2b active sur une ligne pro", async () => {
    const stub = makeFetchStub([
      {
        urlIncludes: "active_entitlements",
        respond: respondQueue(entitlementsActive, b2bEntitlementsActivePro),
      },
    ]);
    // 1er tick : ligne Gold B2C uniquement → le prédicat B2B ne valide PAS.
    const outcome = await pollEntitlement({
      accessToken: "jeton-b2b",
      intervalMs: 10,
      timeoutMs: 2_000,
      fetchImpl: stub.impl,
      isActive: hasActiveB2b,
    });
    expect(outcome).toBe("active");
    expect(stub.mock.mock.calls.length).toBe(2);
  });
});

describe("retour de paiement — succès strict (grâce exclue)", () => {
  const graceGold = { product: "gold", status: "grace", expires_at: PASSE, grace_until: FUTUR };
  const activeGold = { product: "gold", status: "active", expires_at: FUTUR };
  const gracePro = { plan: "pro", status: "grace", expires_at: PASSE, grace_until: FUTUR };
  const activePro = { plan: "pro", status: "active", expires_at: FUTUR };

  it("isStrictlyActive : active oui, grâce NON (différence clé avec isEntitlementActive)", () => {
    // La grâce fait la bascule : souple = actif, strict = pas actif.
    expect(isEntitlementActive(graceGold)).toBe(true);
    expect(isStrictlyActive(graceGold)).toBe(false);
    expect(isStrictlyActive(activeGold)).toBe(true);
  });

  it("isStrictlyActive : statut actif mais échéance passée → NON (au mieux une grâce)", () => {
    expect(isStrictlyActive({ status: "active", expires_at: PASSE })).toBe(false);
    expect(isStrictlyActive({ status: "active", expires_at: PASSE, grace_until: FUTUR })).toBe(false);
  });

  it("isStrictlyActive : trialing oui, canceled/expired non", () => {
    expect(isStrictlyActive({ status: "trialing", expires_at: FUTUR })).toBe(true);
    expect(isStrictlyActive({ status: "canceled", expires_at: FUTUR })).toBe(false);
    expect(isStrictlyActive({ status: "expired", expires_at: PASSE })).toBe(false);
  });

  it("isStrictlyActive : sans status ni date, la présence fait foi (rétro-compat)", () => {
    expect(isStrictlyActive({ product: "gold" })).toBe(true);
  });

  it("hasFreshlyActivatedGold : une grâce Gold préexistante ne valide PAS le retour", () => {
    expect(hasActiveGold([graceGold])).toBe(true); // souple : accès maintenu
    expect(hasFreshlyActivatedGold([graceGold])).toBe(false); // strict : pas un succès
    expect(hasFreshlyActivatedGold([activeGold])).toBe(true);
  });

  it("hasFreshlyActivatedB2b : une grâce lieu préexistante ne valide PAS le retour", () => {
    expect(hasActiveB2b([gracePro])).toBe(true);
    expect(hasFreshlyActivatedB2b([gracePro])).toBe(false);
    expect(hasFreshlyActivatedB2b([activePro])).toBe(true);
  });

  it("les prédicats de retour respectent la famille de plan (B2C vs lieu)", () => {
    expect(hasFreshlyActivatedGold([activePro])).toBe(false); // ligne lieu ⇒ pas Gold spawter
    expect(hasFreshlyActivatedB2b([activeGold])).toBe(false); // ligne B2C ⇒ pas un lieu
  });

  it("corrélation transaction_id : la ligne active doit correspondre si la vue l'expose", () => {
    const activeAvecTxn = { product: "gold", status: "active", expires_at: FUTUR, transaction_id: "SPAWT-TX-42" };
    // Bonne transaction → succès.
    expect(isFreshlyActivated(activeAvecTxn, "SPAWT-TX-42")).toBe(true);
    // Transaction d'une autre activation concurrente → refusée.
    expect(isFreshlyActivated(activeAvecTxn, "SPAWT-TX-99")).toBe(false);
    // Colonne transaction absente → on retombe sur le strict-actif (tolérant).
    expect(isFreshlyActivated(activeGold, "SPAWT-TX-42")).toBe(true);
    // Au niveau collection.
    expect(hasFreshlyActivatedGold([activeAvecTxn], "SPAWT-TX-42")).toBe(true);
    expect(hasFreshlyActivatedGold([activeAvecTxn], "SPAWT-TX-99")).toBe(false);
  });

  it("poll de retour Gold : renouvellement en grâce + paiement ÉCHOUÉ → timeout (jamais succès)", async () => {
    // Le nouveau paiement échoue : la vue ne remonte QUE l'ancienne grâce.
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: entitlementsGraceGold },
    ]);
    const outcome = await pollEntitlement({
      accessToken: "jeton",
      intervalMs: 10,
      timeoutMs: 60,
      fetchImpl: stub.impl,
      isActive: (rows) => hasFreshlyActivatedGold(rows, "SPAWT-TX-echec"),
    });
    expect(outcome).toBe("timeout");
    expect(stub.mock.mock.calls.length).toBeGreaterThan(1);
  });

  it("poll de retour Gold : grâce puis paiement RÉUSSI (ligne active) → succès", async () => {
    // 2 ticks en grâce, puis le webhook bascule la ligne en active.
    const stub = makeFetchStub([
      {
        urlIncludes: "active_entitlements",
        respond: respondQueue(entitlementsGraceGold, entitlementsGraceGold, entitlementsActive),
      },
    ]);
    const attempts: number[] = [];
    const outcome = await pollEntitlement({
      accessToken: "jeton",
      intervalMs: 10,
      timeoutMs: 2_000,
      fetchImpl: stub.impl,
      isActive: (rows) => hasFreshlyActivatedGold(rows),
      onAttempt: (n) => attempts.push(n),
    });
    expect(outcome).toBe("active");
    expect(attempts).toEqual([1, 2, 3]);
  });

  it("poll de retour lieu : grâce b2b_gold + paiement échoué → timeout", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: b2bEntitlementsGraceGold },
    ]);
    const outcome = await pollEntitlement({
      accessToken: "jeton-b2b",
      intervalMs: 10,
      timeoutMs: 60,
      fetchImpl: stub.impl,
      isActive: (rows) => hasFreshlyActivatedB2b(rows),
    });
    expect(outcome).toBe("timeout");
  });

  it("poll de retour lieu : grâce puis paiement réussi (ligne pro active) → succès", async () => {
    const stub = makeFetchStub([
      {
        urlIncludes: "active_entitlements",
        respond: respondQueue(b2bEntitlementsGraceGold, b2bEntitlementsActivePro),
      },
    ]);
    const outcome = await pollEntitlement({
      accessToken: "jeton-b2b",
      intervalMs: 10,
      timeoutMs: 2_000,
      fetchImpl: stub.impl,
      isActive: (rows) => hasFreshlyActivatedB2b(rows),
    });
    expect(outcome).toBe("active");
  });
});
