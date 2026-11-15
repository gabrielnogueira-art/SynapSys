import { PlatformContract } from "@/platform/types";

export const CTR_002_CONFIG: PlatformContract = {
  id: "ctr-002-igreja-modelo",
  code: "CTR-002",
  clientName: "Igreja Esperança (Modelo Igreja Completa)",
  segment: "igreja",
  status: "demonstracao",
  activeModules: ["igreja_ebd", "igreja_tesouraria", "igreja_secretaria"],
  codeFolder: "src/contracts/ctr-002-igreja-modelo",
  entryPath: "/c/ctr-002-igreja-modelo",
  city: "São Paulo - SP",
  responsibleName: "Pr. Marcos Oliveira",
  responsibleEmail: "secretaria@igrejaesperanca.demo",
  planName: "Igreja Completa (EBD + Tesouraria + Secretaria)",
  monthlyValue: 499,
  authSource: "local",
  isReferenceExample: true,
  notes:
    "Modelo demonstrativo do segmento Igreja unindo EBD, Tesouraria Eclesiástica e Secretaria em uma mesma contratação.",
  createdAt: "2026-11-15",
};
