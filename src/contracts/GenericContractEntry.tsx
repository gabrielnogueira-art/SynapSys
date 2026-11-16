import { ModuleId, PlatformContract } from "@/platform/types";
import { ChurchWorkspace } from "@/systems/church/ChurchWorkspace";
import { CommerceContractShell } from "@/systems/commerce/CommerceContractShell";

/**
 * Renderizador padrão para novos contratos criados pela UI da Plataforma
 * antes de receberem customizações exclusivas em pasta própria.
 */
export const GenericContractEntry = ({
  contract,
  initialArea,
}: {
  contract: PlatformContract;
  initialArea?: ModuleId;
}) => {
  if (contract.segment === "comercio") {
    return <CommerceContractShell contract={contract} initialArea={initialArea} />;
  }
  return <ChurchWorkspace contract={contract} initialArea={initialArea} />;
};
