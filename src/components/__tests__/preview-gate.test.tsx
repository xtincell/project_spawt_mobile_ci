// Le rideau d'avant-lancement : visiteur → « Bientôt », équipe → le portail.
//
// Ce qui est protégé ici, et qui vaut plus que l'esthétique : le rideau ne doit
// jamais laisser passer un compte qui n'est pas dans `spawt_staff`. Le cas
// piégeux est le compte GoTrue valide mais non-équipe — l'authentification
// réussit, et c'est seulement la lecture de `spawt_staff` (vide sous RLS) qui
// referme. Si ce second contrôle sautait, n'importe quel abonné entrerait.

import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const fetchStaffIdentity = vi.fn();
const signInStaff = vi.fn();
const signOutStaff = vi.fn(async () => {});

vi.mock("../../lib/preview-gate", () => ({
  isPreviewGate: true,
  fetchStaffIdentity: () => fetchStaffIdentity(),
  signInStaff: (e: string, p: string) => signInStaff(e, p),
  signOutStaff: () => signOutStaff(),
}));

import PreviewGate from "../PreviewGate";

const PORTAIL = <p>La carte du bon goût</p>;
const STAFF = { id: "s1", display_name: "Stéphanie", role: "admin" as const };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("rideau d'avant-lancement", () => {
  it("montre « Bientôt » au visiteur, jamais le portail", async () => {
    fetchStaffIdentity.mockResolvedValue(null);
    render(<PreviewGate>{PORTAIL}</PreviewGate>);
    await waitFor(() => expect(screen.getByText("SPAWT")).toBeInTheDocument());
    expect(screen.queryByText("La carte du bon goût")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accès équipe/i })).toBeInTheDocument();
  });

  it("montre le portail à une session d'équipe déjà ouverte", async () => {
    fetchStaffIdentity.mockResolvedValue(STAFF);
    render(<PreviewGate>{PORTAIL}</PreviewGate>);
    await waitFor(() => expect(screen.getByText("La carte du bon goût")).toBeInTheDocument());
    // Le bandeau doit rappeler que ce n'est pas ce que voit le public : sans
    // lui, on finit par croire que le site est en ligne.
    expect(screen.getByRole("status")).toHaveTextContent(/aperçu équipe/i);
    expect(screen.getByRole("status")).toHaveTextContent("Stéphanie");
  });

  it("ouvre le portail après une connexion équipe réussie", async () => {
    fetchStaffIdentity.mockResolvedValue(null);
    signInStaff.mockResolvedValue({ ok: true, staff: STAFF });
    render(<PreviewGate>{PORTAIL}</PreviewGate>);
    await waitFor(() => expect(screen.getByText("SPAWT")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /accès équipe/i }));
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "stephanie@spawt.online" } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: "motdepasse" } });
    fireEvent.click(screen.getByRole("button", { name: /ouvrir l'aperçu/i }));

    await waitFor(() => expect(screen.getByText("La carte du bon goût")).toBeInTheDocument());
  });

  it("refuse un compte hors équipe et laisse le rideau fermé", async () => {
    fetchStaffIdentity.mockResolvedValue(null);
    signInStaff.mockResolvedValue({
      ok: false,
      message: "Ce compte n'appartient pas à l'équipe SPAWT.",
    });
    render(<PreviewGate>{PORTAIL}</PreviewGate>);
    await waitFor(() => expect(screen.getByText("SPAWT")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /accès équipe/i }));
    fireEvent.change(screen.getByLabelText(/e-mail/i), { target: { value: "abonne@exemple.ci" } });
    fireEvent.change(screen.getByLabelText(/mot de passe/i), { target: { value: "motdepasse" } });
    fireEvent.click(screen.getByRole("button", { name: /ouvrir l'aperçu/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/pas à l'équipe/i));
    expect(screen.queryByText("La carte du bon goût")).not.toBeInTheDocument();
  });

  it("« quitter l'aperçu » referme le rideau", async () => {
    fetchStaffIdentity.mockResolvedValue(STAFF);
    render(<PreviewGate>{PORTAIL}</PreviewGate>);
    await waitFor(() => expect(screen.getByText("La carte du bon goût")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /quitter l'aperçu/i }));
    await waitFor(() => expect(screen.getByText("SPAWT")).toBeInTheDocument());
    expect(signOutStaff).toHaveBeenCalled();
    expect(screen.queryByText("La carte du bon goût")).not.toBeInTheDocument();
  });
});
