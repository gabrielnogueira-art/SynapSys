import { describe, expect, test } from "bun:test";
import {
  contractEntryPath,
  contractPublicUrl,
  DEFAULT_PUBLIC_APP_ORIGIN,
  detectPlatformOrigin,
  isEphemeralOrLocalOrigin,
  normalizeContractSlug,
  resolvePublicAppOrigin,
  shouldRequireEntryLogin,
  validateContractSlug,
  validatePublicAppOrigin,
} from "./contractLinks";

describe("client addresses", () => {
  test("friendly portal address uses new SynapSys origin by default", () => {
    expect(contractPublicUrl({ id: "ctr-004-adcampos", slug: "adcampos" })).toBe(
      "https://synapsys-group.lovable.app/c/adcampos"
    );
  });

  test("direct login address", () => {
    expect(contractPublicUrl({ id: "ctr-004-adcampos", slug: "adcampos" }, true)).toBe(
      "https://synapsys-group.lovable.app/c/adcampos/login"
    );
  });

  test("automatically follows current platform origin when published domain changes", () => {
    expect(detectPlatformOrigin("https://synapsys-group.lovable.app")).toBe(
      "https://synapsys-group.lovable.app"
    );
    expect(detectPlatformOrigin("https://app.synapsys.com.br")).toBe(
      "https://app.synapsys.com.br"
    );
    expect(
      contractPublicUrl(
        { id: "ctr-001-ebd-exemplo" },
        false,
        detectPlatformOrigin("https://portal.minhaigreja.com.br")
      )
    ).toBe("https://portal.minhaigreja.com.br/c/ctr-001-ebd-exemplo");
  });

  test("falls back to default SynapSys origin on local or preview hosts in auto mode", () => {
    expect(isEphemeralOrLocalOrigin("http://localhost:8080")).toBe(true);
    expect(
      isEphemeralOrLocalOrigin("https://id-preview--f4a7ea21-762d-4f06-8b9c-95738e610795.lovable.app")
    ).toBe(true);
    expect(
      isEphemeralOrLocalOrigin("https://id-preview-dbf21ed7--f4a7ea21-762d-4f06-8b9c-95738e610795.lovable.app")
    ).toBe(true);
    expect(
      isEphemeralOrLocalOrigin("https://f4a7ea21-762d-4f06-8b9c-95738e610795.lovableproject.com")
    ).toBe(true);
    expect(isEphemeralOrLocalOrigin("https://synapsys-group.lovable.app")).toBe(false);

    expect(detectPlatformOrigin("http://localhost:8080")).toBe(DEFAULT_PUBLIC_APP_ORIGIN);
    expect(
      detectPlatformOrigin("https://id-preview--f4a7ea21-762d-4f06-8b9c-95738e610795.lovable.app")
    ).toBe(DEFAULT_PUBLIC_APP_ORIGIN);
  });

  test("manual origin overrides automatic detection", () => {
    expect(
      resolvePublicAppOrigin({
        config: { mode: "manual", manualOrigin: "https://clientes.synapsys.com.br" },
        browserOrigin: "https://synapsys-group.lovable.app",
      })
    ).toBe("https://clientes.synapsys.com.br");

    expect(
      resolvePublicAppOrigin({
        config: { mode: "manual", manualOrigin: "http://localhost:8080" },
        browserOrigin: "http://localhost:8080",
      })
    ).toBe("http://localhost:8080");
  });

  test("validates and normalizes manual origins", () => {
    expect(validatePublicAppOrigin("https://synapsys-group.lovable.app/plataforma")).toBe(
      "https://synapsys-group.lovable.app"
    );
    expect(validatePublicAppOrigin("synapsys-group.lovable.app")).toBe(
      "https://synapsys-group.lovable.app"
    );
    expect(validatePublicAppOrigin("localhost:8080")).toBe("http://localhost:8080");
    expect(() => validatePublicAppOrigin("")).toThrow();
    expect(() => validatePublicAppOrigin("javascript:alert(1)")).toThrow();
    expect(() => validatePublicAppOrigin("ftp://example.com")).toThrow();
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
