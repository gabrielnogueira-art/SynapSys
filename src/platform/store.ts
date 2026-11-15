import { useEffect, useState } from "react";
import {
  INITIAL_CHANGE_REQUESTS,
  INITIAL_CONTRACTS,
  INITIAL_PLATFORM_USERS,
} from "@/contracts/registry";
import {
  ChangeRequest,
  ContractStatus,
  ModuleId,
  PlatformContract,
  PlatformUser,
  ProjectSegment,
} from "./types";
import { slugifyContractFolder } from "./catalog";

const STORAGE_KEY = "gestao_plataforma_hub_v1";
const STORE_EVENT = "platform-store-updated";

export interface PlatformState {
  contracts: PlatformContract[];
  users: PlatformUser[];
  changeRequests: ChangeRequest[];
}

function getDefaultState(): PlatformState {
  return {
    contracts: INITIAL_CONTRACTS,
    users: INITIAL_PLATFORM_USERS,
    changeRequests: INITIAL_CHANGE_REQUESTS,
  };
}

function loadState(): PlatformState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw) as Partial<PlatformState>;
    return {
      contracts: Array.isArray(parsed.contracts) && parsed.contracts.length > 0
        ? parsed.contracts
        : INITIAL_CONTRACTS,
      users: Array.isArray(parsed.users) ? parsed.users : INITIAL_PLATFORM_USERS,
      changeRequests: Array.isArray(parsed.changeRequests)
        ? parsed.changeRequests
        : INITIAL_CHANGE_REQUESTS,
    };
  } catch {
    return getDefaultState();
  }
}

function saveState(next: PlatformState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  window.dispatchEvent(new Event(STORE_EVENT));
}

export function getContractById(contractId: string): PlatformContract | undefined {
  return loadState().contracts.find((c) => c.id === contractId);
}

export interface NewContractInput {
  clientName: string;
  segment: ProjectSegment;
  status: ContractStatus;
  activeModules: ModuleId[];
  city?: string;
  responsibleName?: string;
  responsibleEmail?: string;
  planName?: string;
  monthlyValue?: number;
  notes?: string;
}

export function usePlatformStore() {
  const [state, setState] = useState<PlatformState>(() => loadState());

  useEffect(() => {
    const onSync = () => setState(loadState());
    window.addEventListener(STORE_EVENT, onSync);
    window.addEventListener("storage", onSync);
    return () => {
      window.removeEventListener(STORE_EVENT, onSync);
      window.removeEventListener("storage", onSync);
    };
  }, []);

  const commit = (updater: (prev: PlatformState) => PlatformState) => {
    const current = loadState();
    const next = updater(current);
    saveState(next);
    setState(next);
  };

  const addContract = (input: NewContractInput): PlatformContract => {
    const current = loadState();
    const nextNum =
      current.contracts.reduce((max, c) => {
        const m = c.code.match(/(\d+)/);
        return Math.max(max, m ? parseInt(m[1], 10) : 0);
      }, 0) + 1;
    const code = `CTR-${String(nextNum).padStart(3, "0")}`;
    const slug = slugifyContractFolder(code, input.clientName);

    const created: PlatformContract = {
      id: slug,
      code,
      clientName: input.clientName.trim(),
      segment: input.segment,
      status: input.status,
      activeModules: input.activeModules,
      codeFolder: `src/contracts/${slug}`,
      entryPath: `/c/${slug}`,
      city: input.city?.trim() || undefined,
      responsibleName: input.responsibleName?.trim() || undefined,
      responsibleEmail: input.responsibleEmail?.trim() || undefined,
      planName: input.planName?.trim() || undefined,
      monthlyValue: input.monthlyValue,
      authSource: "local",
      notes: input.notes?.trim() || undefined,
      createdAt: new Date().toISOString().slice(0, 10),
    };

    commit((prev) => {
      const nextUsers = [...prev.users];
      if (created.responsibleEmail) {
        nextUsers.unshift({
          id: `usr-${Date.now()}`,
          name: created.responsibleName || created.clientName,
          email: created.responsibleEmail,
          contractId: created.id,
          roleLabel:
            created.segment === "igreja" ? "Gestor da Igreja" : "Gestor do Comércio",
          accessLevel: "gestor_contrato",
          authSource: "local",
          status: "ativo",
          createdAt: created.createdAt,
        });
      }
      return {
        ...prev,
        contracts: [created, ...prev.contracts],
        users: nextUsers,
      };
    });

    return created;
  };

  const updateContract = (
    contractId: string,
    patch: Partial<PlatformContract>
  ) => {
    commit((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) =>
        c.id === contractId ? { ...c, ...patch } : c
      ),
    }));
  };

  const toggleContractModule = (contractId: string, moduleId: ModuleId) => {
    commit((prev) => ({
      ...prev,
      contracts: prev.contracts.map((c) => {
        if (c.id !== contractId) return c;
        const exists = c.activeModules.includes(moduleId);
        const nextModules = exists
          ? c.activeModules.filter((m) => m !== moduleId)
          : [...c.activeModules, moduleId];
        if (nextModules.length === 0) return c; // garante ao menos 1 módulo ativo
        return { ...c, activeModules: nextModules };
      }),
    }));
  };

  const deleteContract = (contractId: string) => {
    commit((prev) => ({
      ...prev,
      contracts: prev.contracts.filter((c) => c.id !== contractId),
      users: prev.users.filter((u) => u.contractId !== contractId),
      changeRequests: prev.changeRequests.filter((r) => r.contractId !== contractId),
    }));
  };

  const addUser = (
    input: Omit<PlatformUser, "id" | "createdAt">
  ) => {
    const user: PlatformUser = {
      ...input,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    commit((prev) => ({ ...prev, users: [user, ...prev.users] }));
  };

  const updateUserStatus = (
    userId: string,
    status: PlatformUser["status"]
  ) => {
    commit((prev) => ({
      ...prev,
      users: prev.users.map((u) => (u.id === userId ? { ...u, status } : u)),
    }));
  };

  const deleteUser = (userId: string) => {
    commit((prev) => ({
      ...prev,
      users: prev.users.filter((u) => u.id !== userId),
    }));
  };

  const addChangeRequest = (
    input: Omit<ChangeRequest, "id" | "createdAt" | "status">
  ) => {
    const req: ChangeRequest = {
      ...input,
      id: `req-${Date.now()}`,
      status: "solicitado",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    commit((prev) => ({
      ...prev,
      changeRequests: [req, ...prev.changeRequests],
    }));
  };

  const updateChangeRequestStatus = (
    requestId: string,
    status: ChangeRequest["status"]
  ) => {
    commit((prev) => ({
      ...prev,
      changeRequests: prev.changeRequests.map((r) =>
        r.id === requestId ? { ...r, status } : r
      ),
    }));
  };

  const deleteChangeRequest = (requestId: string) => {
    commit((prev) => ({
      ...prev,
      changeRequests: prev.changeRequests.filter((r) => r.id !== requestId),
    }));
  };

  const resetToDefaults = () => {
    const def = getDefaultState();
    saveState(def);
    setState(def);
  };

  return {
    contracts: state.contracts,
    users: state.users,
    changeRequests: state.changeRequests,
    addContract,
    updateContract,
    toggleContractModule,
    deleteContract,
    addUser,
    updateUserStatus,
    deleteUser,
    addChangeRequest,
    updateChangeRequestStatus,
    deleteChangeRequest,
    resetToDefaults,
  };
}
