// Tests de la normalisation des numéros ivoiriens (reproduit la logique
// de l'app mobile — numérotation ARTCI post-2022).
import { describe, expect, it } from "vitest";
import { normalizeCivPhone, formatCivPhone, CIV_PHONE_RE } from "../phone";

describe("normalizeCivPhone", () => {
  it("accepte un numéro national mobile de 10 chiffres", () => {
    expect(normalizeCivPhone("0708091011")).toBe("+2250708091011");
  });

  it("accepte espaces, points et tirets", () => {
    expect(normalizeCivPhone("07 08 09 10 11")).toBe("+2250708091011");
    expect(normalizeCivPhone("07.08.09.10.11")).toBe("+2250708091011");
    expect(normalizeCivPhone("07-08-09-10-11")).toBe("+2250708091011");
  });

  it("accepte les préfixes +225, 00225 et 225", () => {
    expect(normalizeCivPhone("+225 07 08 09 10 11")).toBe("+2250708091011");
    expect(normalizeCivPhone("002250708091011")).toBe("+2250708091011");
    expect(normalizeCivPhone("2250708091011")).toBe("+2250708091011");
  });

  it("accepte tous les opérateurs mobiles (0[1-9])", () => {
    for (const prefix of ["01", "02", "03", "04", "05", "06", "07", "08", "09"]) {
      expect(normalizeCivPhone(`${prefix}08091011`)).toBe(`+225${prefix}08091011`);
    }
  });

  it("accepte les fixes (2XXXXXXXX, 9 chiffres)", () => {
    expect(normalizeCivPhone("212345678")).toBe("+225212345678");
  });

  it("rejette les numéros invalides", () => {
    expect(normalizeCivPhone("")).toBeNull();
    expect(normalizeCivPhone("1234")).toBeNull();
    expect(normalizeCivPhone("0008091011")).toBeNull(); // 00 : opérateur inexistant
    expect(normalizeCivPhone("07080910")).toBeNull(); // trop court
    expect(normalizeCivPhone("070809101112")).toBeNull(); // trop long
    expect(normalizeCivPhone("abc")).toBeNull();
    expect(normalizeCivPhone("+33612345678")).toBeNull(); // pas CIV
  });

  it("produit toujours un E.164 conforme à la regex canonique", () => {
    const e164 = normalizeCivPhone("05 04 03 02 01");
    expect(e164).not.toBeNull();
    expect(CIV_PHONE_RE.test(e164 as string)).toBe(true);
  });
});

describe("formatCivPhone", () => {
  it("groupe par paires pour l'affichage", () => {
    expect(formatCivPhone("+2250708091011")).toBe("+225 07 08 09 10 11");
  });
});
