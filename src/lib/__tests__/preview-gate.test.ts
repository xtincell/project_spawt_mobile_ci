// `fetchStaffIdentity` — la lecture de l'identité d'équipe derrière le rideau.
//
// Ce fichier existe à cause d'un bug trouvé en recette navigateur, pas par les
// tests. La version d'origine lisait `spawt_staff` en filtrant sur `is_active`
// seulement, en comptant sur la RLS pour ne rendre que la bonne ligne. Or
// `spawt_staff_select_admin` (migration 0001) autorise un admin à lire TOUTE
// l'équipe : la requête renvoyait trois lignes, `maybeSingle()` sortait en
// erreur, et le rideau refusait exactement les personnes qu'il doit laisser
// entrer. Un moderator passait ; seul le cas nominal cassait.
//
// D'où l'assertion centrale ici : on passe par la RPC `current_staff()`
// (migration 0062), qui ne peut structurellement rendre que la ligne de
// l'appelant — et jamais par un select direct sur la table.

import { describe, expect, it, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const from = vi.fn();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: {},
    rpc: (nom: string) => rpc(nom),
    from: (t: string) => from(t),
  }),
}));

vi.mock("../config", () => ({
  SUPABASE_URL: "https://api.exemple.test",
  SUPABASE_ANON_KEY: "cle-anon",
  isSupabaseConfigured: true,
}));

const STAFF = { id: "uid-1", display_name: "Stéphanie", role: "admin" };

beforeEach(() => {
  vi.clearAllMocks();
  rpc.mockResolvedValue({ data: [STAFF], error: null });
});

describe("fetchStaffIdentity", () => {
  it("passe par current_staff(), jamais par un select sur spawt_staff", async () => {
    const { fetchStaffIdentity } = await import("../preview-gate");
    const staff = await fetchStaffIdentity();

    expect(rpc).toHaveBeenCalledWith("current_staff");
    // La régression à empêcher : relire la table directement, et retomber sur
    // le cas « un admin voit toute l'équipe ».
    expect(from).not.toHaveBeenCalled();
    expect(staff).toEqual(STAFF);
  });

  it("rend null quand la RPC ne rend aucune ligne (compte hors équipe ou désactivé)", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    const { fetchStaffIdentity } = await import("../preview-gate");
    expect(await fetchStaffIdentity()).toBeNull();
  });

  it("rend null sur erreur — le rideau reste fermé, jamais ouvert par défaut", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "réseau" } });
    const { fetchStaffIdentity } = await import("../preview-gate");
    expect(await fetchStaffIdentity()).toBeNull();
  });
});
