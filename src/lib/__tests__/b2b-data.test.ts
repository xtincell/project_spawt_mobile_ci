// Tests de la couche données B2B : requêtes PostgREST exactes (vues 0043,
// réservations 0042, avis publics 0021), fallback « vue absente » (404 /
// 42P01 — le portail peut être déployé avant la base migrée), différence
// gold vs pro sur le funnel, et helpers d'affichage (seuil n<3 → « — »).
import { describe, expect, it } from "vitest";
import {
  fetchB2bAccount,
  fetchB2bSubscription,
  fetchPlaceMonthlyStats,
  fetchPlaceFunnel,
  fetchReservationRequests,
  fetchPlaceReviews,
  fetchPlaceInfo,
  isGoldAccount,
  monthKey,
  lastMonthKeys,
  findMonthRow,
  formatMonthFr,
  formatStatValue,
  countReservationsInMonth,
  computeTtc,
  b2bPlanLabel,
  deriveB2bSubscriptionStatus,
  B2B_PLAN_CATALOG,
  type B2bEntitlementRow,
  type PlaceMonthlyStats,
  type ReservationRequest,
} from "../b2b-data";
import {
  makeFetchStub,
  jsonResponse,
  b2bAccountPro,
  b2bAccountNone,
  b2bMonthlyStats,
  b2bFunnelRows,
  b2bReservations,
  b2bReviews,
  b2bEntitlementsActivePro,
  b2bEntitlementsGraceGold,
  placeInfoRow,
  relationMissing404,
  relationMissing42P01,
  moisKey,
  PLACE_ID_TEST,
} from "../../test/fetch-stub";

const JETON = "jeton-b2b-test";

describe("fetchB2bAccount", () => {
  it("lit b2b_accounts (RLS own) avec le token et renvoie le compte", async () => {
    const stub = makeFetchStub([{ urlIncludes: "b2b_accounts", respond: b2bAccountPro }]);
    const compte = await fetchB2bAccount(JETON, stub.impl);
    expect(compte).toEqual({ place_id: PLACE_ID_TEST, role: "pro" });
    expect(stub.calls[0].url).toBe(
      "https://test.supabase.co/rest/v1/b2b_accounts?select=place_id,role&limit=1",
    );
    const headers = stub.calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${JETON}`);
    expect(headers.apikey).toBe("cle-anon-test");
  });

  it("aucun compte relié → null (l'UI propose le mailto)", async () => {
    const stub = makeFetchStub([{ urlIncludes: "b2b_accounts", respond: b2bAccountNone }]);
    expect(await fetchB2bAccount(JETON, stub.impl)).toBeNull();
  });

  it("table pas encore déployée (404) → null, sans casser", async () => {
    const stub = makeFetchStub([{ urlIncludes: "b2b_accounts", respond: relationMissing404 }]);
    expect(await fetchB2bAccount(JETON, stub.impl)).toBeNull();
  });

  it("401 → ApiError session_expired", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "b2b_accounts", respond: () => jsonResponse({ message: "JWT expired" }, 401) },
    ]);
    await expect(fetchB2bAccount(JETON, stub.impl)).rejects.toMatchObject({
      code: "session_expired",
    });
    expect(isGoldAccount({ role: "gold" })).toBe(true);
    expect(isGoldAccount({ role: "pro" })).toBe(false);
  });
});

describe("fetchPlaceMonthlyStats — vue b2b_place_stats_monthly (0043)", () => {
  it("requête les colonnes exactes de la vue, 12 mois desc", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "b2b_place_stats_monthly", respond: b2bMonthlyStats },
    ]);
    const result = await fetchPlaceMonthlyStats(PLACE_ID_TEST, JETON, stub.impl);
    expect(stub.calls[0].url).toBe(
      "https://test.supabase.co/rest/v1/b2b_place_stats_monthly" +
        "?select=month,spawts_verifies,avis,note_moyenne_ponderee" +
        `&place_id=eq.${PLACE_ID_TEST}&order=month.desc&limit=12`,
    );
    expect(result.available).toBe(true);
    if (!result.available) throw new Error("attendu disponible");
    expect(result.rows[0].note_moyenne_ponderee).toBe(4.2);
    // Le mois sous le seuil n<3 arrive avec des NULL — jamais des zéros.
    expect(result.rows[1].spawts_verifies).toBeNull();
  });

  it("vue absente : 404 → not_ready (portail déployé avant la base)", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "b2b_place_stats_monthly", respond: relationMissing404 },
    ]);
    expect(await fetchPlaceMonthlyStats(PLACE_ID_TEST, JETON, stub.impl)).toEqual({
      available: false,
      reason: "not_ready",
    });
  });

  it("vue absente : 400 + code PG 42P01 → not_ready aussi", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "b2b_place_stats_monthly", respond: relationMissing42P01 },
    ]);
    expect(await fetchPlaceMonthlyStats(PLACE_ID_TEST, JETON, stub.impl)).toEqual({
      available: false,
      reason: "not_ready",
    });
  });

  it("500 → error, 401 → session_expired", async () => {
    const stub500 = makeFetchStub([
      { urlIncludes: "b2b_place_stats_monthly", respond: () => jsonResponse({ message: "boom" }, 500) },
    ]);
    expect(await fetchPlaceMonthlyStats(PLACE_ID_TEST, JETON, stub500.impl)).toEqual({
      available: false,
      reason: "error",
    });
    const stub401 = makeFetchStub([
      { urlIncludes: "b2b_place_stats_monthly", respond: () => jsonResponse({ message: "JWT expired" }, 401) },
    ]);
    expect(await fetchPlaceMonthlyStats(PLACE_ID_TEST, JETON, stub401.impl)).toEqual({
      available: false,
      reason: "session_expired",
    });
  });
});

describe("fetchPlaceFunnel — vue b2b_place_funnel (0043, gold only)", () => {
  it("requête les étapes du funnel par mois", async () => {
    const stub = makeFetchStub([{ urlIncludes: "b2b_place_funnel", respond: b2bFunnelRows }]);
    const result = await fetchPlaceFunnel(PLACE_ID_TEST, JETON, stub.impl);
    expect(stub.calls[0].url).toBe(
      "https://test.supabase.co/rest/v1/b2b_place_funnel" +
        `?select=month,views,saves,shares,spawts&place_id=eq.${PLACE_ID_TEST}` +
        "&order=month.desc&limit=12",
    );
    expect(result.available).toBe(true);
    if (!result.available) throw new Error("attendu disponible");
    expect(result.rows[0].views).toBe(240);
    expect(result.rows[0].shares).toBeNull();
  });

  it("compte pro : le gate SQL is_b2b_gold_of rend la vue VIDE, pas une erreur", async () => {
    // C'est le comportement réel de la vue 0043 pour un role 'pro' — d'où la
    // règle côté UI : ne pas appeler le funnel hors gold, montrer l'upsell.
    const stub = makeFetchStub([{ urlIncludes: "b2b_place_funnel", respond: () => jsonResponse([]) }]);
    expect(await fetchPlaceFunnel(PLACE_ID_TEST, JETON, stub.impl)).toEqual({
      available: true,
      rows: [],
    });
  });
});

describe("fetchReservationRequests — reservation_requests (0042)", () => {
  it("liste les demandes du lieu, récentes d'abord", async () => {
    const stub = makeFetchStub([{ urlIncludes: "reservation_requests", respond: b2bReservations }]);
    const result = await fetchReservationRequests(PLACE_ID_TEST, JETON, stub.impl);
    expect(stub.calls[0].url).toBe(
      "https://test.supabase.co/rest/v1/reservation_requests" +
        `?select=id,party_size,slot_at,channel,status,created_at&place_id=eq.${PLACE_ID_TEST}` +
        "&order=created_at.desc&limit=50",
    );
    expect(result.available).toBe(true);
    if (!result.available) throw new Error("attendu disponible");
    expect(result.rows).toHaveLength(3);
    expect(result.rows[0].status).toBe("confirmed");
  });

  it("table absente → not_ready", async () => {
    const stub = makeFetchStub([{ urlIncludes: "reservation_requests", respond: relationMissing404 }]);
    expect(await fetchReservationRequests(PLACE_ID_TEST, JETON, stub.impl)).toEqual({
      available: false,
      reason: "not_ready",
    });
  });
});

describe("fetchPlaceReviews — avis publiés (RLS 0021)", () => {
  it("réplique le filtre de la policy : note non-nulle, non supprimé, sans seed", async () => {
    const stub = makeFetchStub([{ urlIncludes: "spawt_checkin", respond: b2bReviews }]);
    const result = await fetchPlaceReviews(PLACE_ID_TEST, JETON, stub.impl);
    const url = stub.calls[0].url;
    expect(url).toContain("/rest/v1/spawt_checkin?select=id,note_etoiles,texte_avis,created_at,");
    expect(url).toContain("spawters_public!inner(display_name,stade)");
    expect(url).toContain("note_etoiles=not.is.null");
    expect(url).toContain("deleted_at=is.null");
    expect(url).toContain("is_seed=eq.false");
    expect(url).toContain("order=created_at.desc");
    expect(result.available).toBe(true);
    if (!result.available) throw new Error("attendu disponible");
    expect(result.rows[0].spawters_public?.display_name).toBe("Awa");
  });

  it("lecture indisponible → not_ready (l'UI retombe sur les agrégats)", async () => {
    const stub = makeFetchStub([{ urlIncludes: "spawt_checkin", respond: relationMissing404 }]);
    expect(await fetchPlaceReviews(PLACE_ID_TEST, JETON, stub.impl)).toEqual({
      available: false,
      reason: "not_ready",
    });
  });
});

describe("fetchPlaceInfo — nom public du lieu", () => {
  it("renvoie nom + quartier quand la fiche est publiée", async () => {
    const stub = makeFetchStub([{ urlIncludes: "rest/v1/places", respond: placeInfoRow }]);
    expect(await fetchPlaceInfo(PLACE_ID_TEST, JETON, stub.impl)).toEqual({
      name: "Chez Tantie Alice",
      neighborhood: "Cocody",
    });
  });

  it("fiche introuvable ou table absente → null (l'UI garde un titre neutre)", async () => {
    const stubVide = makeFetchStub([{ urlIncludes: "rest/v1/places", respond: () => jsonResponse([]) }]);
    expect(await fetchPlaceInfo(PLACE_ID_TEST, JETON, stubVide.impl)).toBeNull();
    const stub404 = makeFetchStub([{ urlIncludes: "rest/v1/places", respond: relationMissing404 }]);
    expect(await fetchPlaceInfo(PLACE_ID_TEST, JETON, stub404.impl)).toBeNull();
  });
});

describe("helpers d'affichage", () => {
  it("monthKey / lastMonthKeys : clés PostgREST, passage d'année compris", () => {
    expect(monthKey(new Date(Date.UTC(2026, 6, 26)))).toBe("2026-07-01");
    expect(lastMonthKeys(3, new Date(Date.UTC(2026, 1, 15)))).toEqual([
      "2026-02-01",
      "2026-01-01",
      "2025-12-01",
    ]);
  });

  it("formatMonthFr : libellé français du mois", () => {
    expect(formatMonthFr("2026-07-01")).toBe("juillet 2026");
    expect(formatMonthFr("n-importe-quoi")).toBe("n-importe-quoi");
  });

  it("formatStatValue : NULL du seuil n<3 → « — », nombres au format FR", () => {
    expect(formatStatValue(null)).toBe("—");
    expect(formatStatValue(undefined)).toBe("—");
    expect(formatStatValue(12)).toBe("12");
    expect(formatStatValue(4.2)).toBe("4,2");
  });

  it("findMonthRow / countReservationsInMonth", () => {
    const rows: PlaceMonthlyStats[] = [
      { month: moisKey(0), spawts_verifies: 12, avis: 5, note_moyenne_ponderee: 4.2 },
    ];
    expect(findMonthRow(rows, moisKey(0))?.avis).toBe(5);
    expect(findMonthRow(rows, moisKey(3))).toBeNull();

    const resas = [
      { created_at: `${moisKey(0).slice(0, 8)}12T10:00:00Z` },
      { created_at: `${moisKey(0).slice(0, 8)}05T18:00:00Z` },
      { created_at: `${moisKey(1).slice(0, 8)}18T09:00:00Z` },
    ] as ReservationRequest[];
    expect(countReservationsInMonth(resas, moisKey(0))).toBe(2);
    expect(countReservationsInMonth(resas, moisKey(1))).toBe(1);
  });
});

describe("abonnement du lieu — catalogue, dérivation d'état, fetch", () => {
  const FUTUR = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const PASSE = new Date(Date.now() - 2 * 86_400_000).toISOString();

  it("computeTtc : TVA 18 % — pro 15 000 → 17 700, b2b_gold 65 000 → 76 700", () => {
    expect(computeTtc(B2B_PLAN_CATALOG.pro.priceHt)).toBe(17700);
    expect(computeTtc(B2B_PLAN_CATALOG.b2b_gold.priceHt)).toBe(76700);
  });

  it("b2bPlanLabel : codes connus traduits, repli sur le code brut", () => {
    expect(b2bPlanLabel("pro")).toBe("Spawt Pro");
    expect(b2bPlanLabel("b2b_gold")).toBe("Spawt Gold");
    expect(b2bPlanLabel("mystere")).toBe("mystere");
    expect(b2bPlanLabel(null)).toBe("—");
  });

  it("deriveB2bSubscriptionStatus : active / grace / expired / none", () => {
    const active: B2bEntitlementRow = {
      plan: "pro",
      status: "active",
      is_active: true,
      expires_at: FUTUR,
      grace_until: null,
    };
    const grace: B2bEntitlementRow = {
      plan: "b2b_gold",
      status: "grace",
      is_active: true,
      expires_at: PASSE,
      grace_until: FUTUR,
    };
    const expired: B2bEntitlementRow = {
      plan: "pro",
      status: "expired",
      is_active: false,
      expires_at: PASSE,
      grace_until: null,
    };

    expect(deriveB2bSubscriptionStatus([active])).toMatchObject({ kind: "active", plan: "pro" });
    expect(deriveB2bSubscriptionStatus([grace])).toMatchObject({ kind: "grace", plan: "b2b_gold" });
    expect(deriveB2bSubscriptionStatus([expired])).toMatchObject({ kind: "expired", plan: "pro" });
    expect(deriveB2bSubscriptionStatus([])).toEqual({ kind: "none" });
  });

  it("deriveB2bSubscriptionStatus : les lignes pending/cancelled ne comptent pas", () => {
    const pending: B2bEntitlementRow = {
      plan: "pro",
      status: "pending",
      is_active: false,
      expires_at: null,
      grace_until: null,
    };
    const cancelled: B2bEntitlementRow = {
      plan: "b2b_gold",
      status: "cancelled",
      is_active: false,
      expires_at: null,
      grace_until: null,
    };
    expect(deriveB2bSubscriptionStatus([pending, cancelled])).toEqual({ kind: "none" });
  });

  it("fetchB2bSubscription : requête active_entitlements filtrée plans lieux", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: b2bEntitlementsActivePro },
    ]);
    const result = await fetchB2bSubscription(JETON, stub.impl);
    expect(result).toMatchObject({ available: true, status: { kind: "active", plan: "pro" } });
    expect(stub.calls[0].url).toContain("/rest/v1/active_entitlements");
    expect(stub.calls[0].url).toContain("plan=in.(pro,b2b_gold)");
    const headers = stub.calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${JETON}`);
  });

  it("fetchB2bSubscription : grâce détectée (b2b_gold)", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: b2bEntitlementsGraceGold },
    ]);
    const result = await fetchB2bSubscription(JETON, stub.impl);
    expect(result).toMatchObject({ available: true, status: { kind: "grace", plan: "b2b_gold" } });
  });

  it("fetchB2bSubscription : vue absente → not_ready ; 401 → session_expired", async () => {
    const stub404 = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: relationMissing404 },
    ]);
    expect(await fetchB2bSubscription(JETON, stub404.impl)).toEqual({
      available: false,
      reason: "not_ready",
    });

    const stub401 = makeFetchStub([
      { urlIncludes: "active_entitlements", respond: () => jsonResponse({ message: "JWT expired" }, 401) },
    ]);
    expect(await fetchB2bSubscription(JETON, stub401.impl)).toEqual({
      available: false,
      reason: "session_expired",
    });
  });
});
