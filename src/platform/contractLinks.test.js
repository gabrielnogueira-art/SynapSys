import { describe, expect, test } from "bun:test";
import { contractEntryPath, contractPublicUrl, normalizeContractSlug, shouldRequireEntryLogin, validateContractSlug } from "./contractLinks";

describe("client addresses", () => {
  test("friendly portal address", () => {
    expect(contractPublicUrl({ id: "ctr-004-adcampos", slug: "adcampos" })).toBe("https://ebd-system-pro.lovable.app/c/adcampos");
  });
  test("direct login address", () => {
    expect(contractPublicUrl({ id: "ctr-004-adcampos", slug: "adcampos" }, true)).toBe("https://ebd-system-pro.lovable.app/c/adcampos/login");
  });
  test("legacy IDs remain usable without a slug", () => {
    expect(contractEntryPath({ id: "ctr-001-ebd-exemplo" })).toBe("/c/ctr-001-ebd-exemplo");
  });
  test("login-first redirects only unauthenticated entry", () => {
    expect(shouldRequireEntryLogin(true, false)).toBe(true);
    expect(shouldRequireEntryLogin(true, true)).toBe(false);
    expect(shouldRequireEntryLogin(false, false)).toBe(false);
  });
  test("suggests normalized address without accents", () => {
    expect(normalizeContractSlug("Igreja São Francisco")).toBe("igreja-sao-francisco");
  });
  test("rejects paths and invalid links", () => {
    expect(() => validateContractSlug("../outro/login")).toThrow();
    expect(() => validateContractSlug("A".repeat(81))).toThrow();
    expect(validateContractSlug("adcampos")).toBe("adcampos");
  });
});