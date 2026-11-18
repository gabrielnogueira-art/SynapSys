import { useContractModuleData } from "@/platform/useContractModuleData";
import {
  createEmptyCantinaData,
  createEmptyLivrariaData,
  createEmptySocialData,
} from "@/platform/labs/labsDefaults";
import type { LabRoleMode } from "@/platform/labs/labsTypes";
import { CantinaWorkspace } from "./CantinaWorkspace";
import { LivrariaWorkspace } from "./LivrariaWorkspace";
import { SocialWorkspace } from "./SocialWorkspace";

const EMPTY_CANTINA = createEmptyCantinaData();
const EMPTY_LIVRARIA = createEmptyLivrariaData();
const EMPTY_SOCIAL = createEmptySocialData();

function toLabRole(level?: string | null): LabRoleMode {
  if (level === "operador") return "operador";
  if (level === "voluntario") return "voluntario";
  return "admin";
}

export const ChurchCantinaContractView = ({
  contractId,
  moduleLevel,
}: {
  contractId: string;
  moduleLevel?: string | null;
}) => {
  const { value, update, loading, error } = useContractModuleData(
    contractId,
    "church_cantina",
    EMPTY_CANTINA
  );
  if (loading) return <div className="p-6 text-muted-foreground">Carregando Cantina…</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <CantinaWorkspace data={value} onChange={update} roleMode={toLabRole(moduleLevel)} />
    </div>
  );
};

export const ChurchLivrariaContractView = ({
  contractId,
  moduleLevel,
}: {
  contractId: string;
  moduleLevel?: string | null;
}) => {
  const { value, update, loading, error } = useContractModuleData(
    contractId,
    "church_livraria",
    EMPTY_LIVRARIA
  );
  if (loading) return <div className="p-6 text-muted-foreground">Carregando Livraria…</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <LivrariaWorkspace data={value} onChange={update} roleMode={toLabRole(moduleLevel)} />
    </div>
  );
};

export const ChurchSocialContractView = ({
  contractId,
  moduleLevel,
}: {
  contractId: string;
  moduleLevel?: string | null;
}) => {
  const { value, update, loading, error } = useContractModuleData(
    contractId,
    "church_social",
    EMPTY_SOCIAL
  );
  if (loading) return <div className="p-6 text-muted-foreground">Carregando Ação Social…</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <SocialWorkspace data={value} onChange={update} roleMode={toLabRole(moduleLevel)} />
    </div>
  );
};
