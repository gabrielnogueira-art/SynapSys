import { useContractModuleData } from "@/platform/useContractModuleData";
import {
  createEmptyCantinaData,
  createEmptyLivrariaData,
  createEmptyMembroData,
  createEmptySocialData,
} from "@/platform/labs/labsDefaults";
import type { LabRoleMode } from "@/platform/labs/labsTypes";
import { CantinaWorkspace } from "./CantinaWorkspace";
import { LivrariaWorkspace } from "./LivrariaWorkspace";
import { SocialWorkspace } from "./SocialWorkspace";
import { MembroWorkspace } from "./MembroWorkspace";

const EMPTY_CANTINA = createEmptyCantinaData();
const EMPTY_LIVRARIA = createEmptyLivrariaData();
const EMPTY_SOCIAL = createEmptySocialData();
const EMPTY_MEMBRO = createEmptyMembroData();

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

export const ChurchMembroContractView = ({
  contractId,
  moduleLevel,
}: {
  contractId: string;
  moduleLevel?: string | null;
}) => {
  const { value, update, loading, error } = useContractModuleData(
    contractId,
    "church_membro",
    EMPTY_MEMBRO
  );
  if (loading) return <div className="p-6 text-muted-foreground">Carregando Portal do Membro…</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <MembroWorkspace data={value} onChange={update} roleMode={toLabRole(moduleLevel)} />
    </div>
  );
};
