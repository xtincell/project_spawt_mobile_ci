// Tests de la couche API : flux OTP (contrats otp-send / otp-verify) et
// checkout Gold (contrat payment-checkout mocké — la fonction n'existe pas
// encore côté backend, ces tests SONT le contrat).
import { describe, expect, it } from "vitest";
import { sendOtp, verifyOtp, startCheckout, ApiError } from "../api";
import {
  makeFetchStub,
  otpSendOk,
  otpSendRateLimited,
  otpVerifyOk,
  otpVerifyInvalid,
  checkoutOk,
  checkoutExpired,
  checkoutAlreadyActive,
  checkoutProviderError,
} from "../../test/fetch-stub";

const PHONE = "+2250708091011";

describe("sendOtp", () => {
  it("poste phone_e164 avec les headers anon (apikey + Bearer)", async () => {
    const stub = makeFetchStub([{ urlIncludes: "otp-send", respond: otpSendOk }]);
    const resp = await sendOtp(PHONE, stub.impl);
    expect(resp.success).toBe(true);
    expect(stub.calls).toHaveLength(1);
    expect(stub.calls[0].url).toBe("https://test.supabase.co/functions/v1/otp-send");
    expect(stub.calls[0].body).toEqual({ phone_e164: PHONE });
    const headers = stub.calls[0].init?.headers as Record<string, string>;
    expect(headers.apikey).toBe("cle-anon-test");
    expect(headers.authorization).toBe("Bearer cle-anon-test");
  });

  it("remonte le rate limit 429 avec retry_after_seconds", async () => {
    const stub = makeFetchStub([{ urlIncludes: "otp-send", respond: otpSendRateLimited }]);
    const err = await sendOtp(PHONE, stub.impl).catch((e) => e as ApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(429);
    expect((err as ApiError).code).toBe("rate_limited");
    expect((err as ApiError).retryAfterSeconds).toBe(3600);
  });
});

describe("verifyOtp", () => {
  it("retourne les tokens de session du format otp-verify", async () => {
    const stub = makeFetchStub([{ urlIncludes: "otp-verify", respond: () => otpVerifyOk() }]);
    const resp = await verifyOtp(PHONE, "123456", stub.impl);
    expect(resp.access_token).toBe("jeton-acces-test");
    expect(resp.refresh_token).toBe("jeton-refresh-test");
    expect(stub.calls[0].body).toEqual({ phone_e164: PHONE, otp_code: "123456" });
  });

  it("remonte invalid_otp (401) pour un mauvais code", async () => {
    const stub = makeFetchStub([{ urlIncludes: "otp-verify", respond: otpVerifyInvalid }]);
    const err = await verifyOtp(PHONE, "000000", stub.impl).catch((e) => e as ApiError);
    expect((err as ApiError).status).toBe(401);
    expect((err as ApiError).code).toBe("invalid_otp");
  });
});

describe("startCheckout — contrat payment-checkout", () => {
  const baseOpts = {
    accessToken: "jeton-spawter",
    returnUrl: "https://spawt.online/gold/retour",
    mock: false,
  };

  it("200 : poste plan + return_url avec le Bearer du spawter", async () => {
    const stub = makeFetchStub([{ urlIncludes: "payment-checkout", respond: () => checkoutOk() }]);
    const resp = await startCheckout({ ...baseOpts, plan: "gold_monthly", fetchImpl: stub.impl });
    expect(resp.payment_url).toContain("cinetpay");
    expect(resp.transaction_id).toBe("txn-test-001");
    expect(stub.calls[0].url).toBe("https://test.supabase.co/functions/v1/payment-checkout");
    expect(stub.calls[0].body).toEqual({
      plan: "gold_monthly",
      return_url: "https://spawt.online/gold/retour",
    });
    const headers = stub.calls[0].init?.headers as Record<string, string>;
    expect(headers.authorization).toBe("Bearer jeton-spawter");
    expect(headers.apikey).toBe("cle-anon-test");
  });

  it("401 : session expirée", async () => {
    const stub = makeFetchStub([{ urlIncludes: "payment-checkout", respond: checkoutExpired }]);
    const err = await startCheckout({ ...baseOpts, plan: "gold_annual", fetchImpl: stub.impl }).catch(
      (e) => e as ApiError,
    );
    expect((err as ApiError).status).toBe(401);
  });

  it("409 : already_active (déjà Gold)", async () => {
    const stub = makeFetchStub([{ urlIncludes: "payment-checkout", respond: checkoutAlreadyActive }]);
    const err = await startCheckout({ ...baseOpts, plan: "gold_annual", fetchImpl: stub.impl }).catch(
      (e) => e as ApiError,
    );
    expect((err as ApiError).status).toBe(409);
    expect((err as ApiError).code).toBe("already_active");
  });

  it("502 : provider_error (CinetPay indisponible)", async () => {
    const stub = makeFetchStub([{ urlIncludes: "payment-checkout", respond: checkoutProviderError }]);
    const err = await startCheckout({ ...baseOpts, plan: "gold_monthly", fetchImpl: stub.impl }).catch(
      (e) => e as ApiError,
    );
    expect((err as ApiError).status).toBe(502);
    expect((err as ApiError).code).toBe("provider_error");
  });

  it("mode démo : aucune requête, payment_url pointe sur /gold/retour", async () => {
    const stub = makeFetchStub([]);
    const resp = await startCheckout({
      ...baseOpts,
      plan: "gold_annual",
      fetchImpl: stub.impl,
      mock: true,
    });
    expect(stub.calls).toHaveLength(0);
    expect(resp.transaction_id).toMatch(/^mock-gold_annual-/);
    const url = new URL(resp.payment_url);
    expect(url.pathname).toBe("/gold/retour");
    expect(url.searchParams.get("transaction_id")).toBe(resp.transaction_id);
  });
});
