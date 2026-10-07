// Tests de la couche données ambassadeur : requête PostgREST exacte (table
// ambassadors 0044, RLS own), fallback « table absente » (404 / 42P01 → même
// parcours que « pas encore ambassadeur »), session expirée, et contenu de
// référence des paliers (source unique PALIERS).
import { describe, expect, it } from "vitest";
import { fetchAmbassadorStatus, palierNom, PALIERS } from "../ambassadors";
import {
  makeFetchStub,
  jsonResponse,
  ambassadorRow,
  ambassadorNone,
  relationMissing404,
  relationMissing42P01,
} from "../../test/fetch-stub";

const JETON = "jeton-ambassadeur-test";

describe("fetchAmbassadorStatus", () => {
  it("lit ambassadors (RLS own) avec le token et renvoie palier + since", async () => {
    const stub = makeFetchStub([{ urlIncludes: "ambassadors", respond: () => ambassadorRow(2) }]);
    const statut = await fetchAmbassadorStatus(JETON, stub.impl);
    expect(statut).toEqual({ status: "ambassador", palier: 2, since: "2026-06-15T10:00:00Z" });
    expect(stub.calls[0].url).toBe(
      "https://test.supabase.co/rest/v1/ambassadors?select=palier,since&limit=1",
    );
    const headers = stub.calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe(`Bearer ${JETON}`);
    expect(headers.apikey).toBe("cle-anon-test");
  });

  it("aucune ligne → none (le palier est attribué par l'équipe)", async () => {
    const stub = makeFetchStub([{ urlIncludes: "ambassadors", respond: ambassadorNone }]);
    expect(await fetchAmbassadorStatus(JETON, stub.impl)).toEqual({ status: "none" });
  });

  it("table pas encore migrée (404 PGRST205) → none, sans casser", async () => {
    const stub = makeFetchStub([{ urlIncludes: "ambassadors", respond: relationMissing404 }]);
    expect(await fetchAmbassadorStatus(JETON, stub.impl)).toEqual({ status: "none" });
  });

  it("table pas encore migrée (400 + code PG 42P01) → none, sans casser", async () => {
    const stub = makeFetchStub([{ urlIncludes: "ambassadors", respond: relationMissing42P01 }]);
    expect(await fetchAmbassadorStatus(JETON, stub.impl)).toEqual({ status: "none" });
  });

  it("401 → session_expired (l'UI propose la reconnexion)", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "ambassadors", respond: () => jsonResponse({ message: "JWT expired" }, 401) },
    ]);
    expect(await fetchAmbassadorStatus(JETON, stub.impl)).toEqual({ status: "session_expired" });
  });

  it("erreur serveur (500) ou palier hors contrat → error", async () => {
    const stub500 = makeFetchStub([
      { urlIncludes: "ambassadors", respond: () => jsonResponse({ message: "boom" }, 500) },
    ]);
    expect(await fetchAmbassadorStatus(JETON, stub500.impl)).toEqual({ status: "error" });

    // Un palier inconnu (hors 1-3) ne doit jamais s'afficher tel quel.
    const stubHors = makeFetchStub([{ urlIncludes: "ambassadors", respond: () => ambassadorRow(7) }]);
    expect(await fetchAmbassadorStatus(JETON, stubHors.impl)).toEqual({ status: "error" });
  });

  it("panne réseau → error (pas d'exception qui remonte à l'UI)", async () => {
    const impl = (async () => {
      throw new TypeError("réseau coupé");
    }) as unknown as typeof fetch;
    expect(await fetchAmbassadorStatus(JETON, impl)).toEqual({ status: "error" });
  });
});

describe("PALIERS — contenu de référence du programme", () => {
  it("expose les 3 paliers dans l'ordre, avec leurs noms canoniques", () => {
    expect(PALIERS.map((p) => [p.palier, p.nom])).toEqual([
      [1, "Allié Content"],
      [2, "Ambassadeur Actif"],
      [3, "Guide Ambassadeur"],
    ]);
    // Chaque palier a une rétribution phare, des critères et des avantages —
    // jamais de carte vide.
    for (const p of PALIERS) {
      expect(p.phare.length).toBeGreaterThan(0);
      expect(p.criteres.length).toBeGreaterThanOrEqual(2);
      expect(p.avantages.length).toBeGreaterThanOrEqual(1);
    }
    // Les fourchettes des paliers rémunérés sont mensuelles.
    expect(PALIERS[1].pharePeriode).toBe("/mois");
    expect(PALIERS[2].pharePeriode).toBe("/mois");
  });

  it("palierNom : libellé pour 1-3, null hors contrat", () => {
    expect(palierNom(1)).toBe("Allié Content");
    expect(palierNom(3)).toBe("Guide Ambassadeur");
    expect(palierNom(0)).toBeNull();
    expect(palierNom(4)).toBeNull();
  });
});
