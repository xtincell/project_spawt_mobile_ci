// Test du flux de connexion OTP complet : saisie du numéro → otp-send →
// saisie du code → otp-verify → supabase.auth.setSession → redirection.
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router";
import ConnexionPage from "../ConnexionPage";
import {
  makeFetchStub,
  otpSendOk,
  otpSendRateLimited,
  otpVerifyOk,
  otpVerifyInvalid,
} from "../../test/fetch-stub";

// Client Supabase mocké : on vérifie l'appel setSession, pas GoTrue.
const setSession = vi.fn(async (_tokens: unknown) => ({ data: {}, error: null }));
vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      setSession: (args: unknown) => setSession(args),
    },
  },
}));

function renderConnexion(initialEntry = "/connexion") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/connexion" element={<ConnexionPage />} />
        <Route path="/compte" element={<h1>Page compte</h1>} />
        <Route path="/gold/paiement" element={<h1>Page paiement</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ConnexionPage", () => {
  beforeEach(() => {
    setSession.mockClear();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envoie l'OTP puis ouvre la session avec les tokens d'otp-verify", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "otp-send", respond: otpSendOk },
      { urlIncludes: "otp-verify", respond: () => otpVerifyOk() },
    ]);
    vi.stubGlobal("fetch", stub.impl);
    renderConnexion("/connexion?next=/gold/paiement");

    fireEvent.change(screen.getByLabelText(/ton numéro ivoirien/i), {
      target: { value: "07 08 09 10 11" },
    });
    fireEvent.click(screen.getByRole("button", { name: /recevoir mon code/i }));

    // Étape OTP atteinte, l'envoi est parti normalisé en E.164.
    const otpInput = await screen.findByLabelText(/code à 6 chiffres/i);
    expect(stub.calls[0].url).toContain("/functions/v1/otp-send");
    expect(stub.calls[0].body).toEqual({ phone_e164: "+2250708091011" });

    fireEvent.change(otpInput, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: /me connecter/i }));

    await waitFor(() => {
      expect(setSession).toHaveBeenCalledWith({
        access_token: "jeton-acces-test",
        refresh_token: "jeton-refresh-test",
      });
    });
    expect(stub.calls[1].body).toEqual({ phone_e164: "+2250708091011", otp_code: "123456" });
    // Redirection vers ?next= après connexion.
    expect(await screen.findByText("Page paiement")).toBeInTheDocument();
  });

  it("affiche l'erreur du rate limit 429", async () => {
    const stub = makeFetchStub([{ urlIncludes: "otp-send", respond: otpSendRateLimited }]);
    vi.stubGlobal("fetch", stub.impl);
    renderConnexion();

    fireEvent.change(screen.getByLabelText(/ton numéro ivoirien/i), {
      target: { value: "0708091011" },
    });
    fireEvent.click(screen.getByRole("button", { name: /recevoir mon code/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/trop de tentatives/i);
    expect(setSession).not.toHaveBeenCalled();
  });

  it("affiche l'erreur invalid_otp sans ouvrir de session", async () => {
    const stub = makeFetchStub([
      { urlIncludes: "otp-send", respond: otpSendOk },
      { urlIncludes: "otp-verify", respond: otpVerifyInvalid },
    ]);
    vi.stubGlobal("fetch", stub.impl);
    renderConnexion();

    fireEvent.change(screen.getByLabelText(/ton numéro ivoirien/i), {
      target: { value: "0708091011" },
    });
    fireEvent.click(screen.getByRole("button", { name: /recevoir mon code/i }));

    const otpInput = await screen.findByLabelText(/code à 6 chiffres/i);
    fireEvent.change(otpInput, { target: { value: "999999" } });
    fireEvent.click(screen.getByRole("button", { name: /me connecter/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/code incorrect/i);
    expect(setSession).not.toHaveBeenCalled();
  });

  it("désactive le bouton d'envoi tant que le numéro est invalide", () => {
    const stub = makeFetchStub([]);
    vi.stubGlobal("fetch", stub.impl);
    renderConnexion();

    const bouton = screen.getByRole("button", { name: /recevoir mon code/i });
    expect(bouton).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/ton numéro ivoirien/i), {
      target: { value: "12" },
    });
    expect(bouton).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/ton numéro ivoirien/i), {
      target: { value: "0708091011" },
    });
    expect(bouton).toBeEnabled();
  });
});
