import { PlatformContract } from "@/platform/types";

export const CTR_003_CONFIG: PlatformContract = {
  id: "ctr-003-comercio-modelo",
  code: "CTR-003",
  clientName: "Comercial Horizonte Ltda (Modelo Comércio)",
  segment: "comercio",
  status: "demonstracao",
  activeModules: [
    "comercio_tesouraria",
    "comercio_secretaria",
    "comercio_estoque",
    "comercio_rh",
    "comercio_pdv",
  ],
  codeFolder: "src/contracts/ctr-003-comercio-modelo",
  entryPath: "/c/ctr-003-comercio-modelo",
  city: "Belo Horizonte - MG",
  responsibleName: "Juliana Mendes",
  responsibleEmail: "gestao@comercialhorizonte.demo",
  planName: "Comércio Full (Financeiro + Estoque + RH + PDV)",
  monthlyValue: 590,
  authSource: "local",
  isReferenceExample: true,
  notes:
    "Exemplo de projeto para comércio/empresas com módulos próprios (sem vínculo com EBD/Igreja).",
  createdAt: "2026-11-15",
};
