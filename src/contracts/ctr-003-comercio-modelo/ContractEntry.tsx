import { ModuleId, PlatformContract } from "@/platform/types";
import { CommerceContractShell } from "@/systems/commerce/CommerceContractShell";

/**
 * Entrada exclusiva do contrato CTR-003 (Comércio Modelo).
 * Customizações específicas para este cliente ficam nesta pasta (src/contracts/ctr-003-comercio-modelo/).
 */
export const Ctr003Entry = ({
  contract,
  initialArea,
}: {
  contract: PlatformContract;
  initialArea?: ModuleId;
}) => {
  return <CommerceContractShell contract={contract} initialArea={initialArea} />;
};
