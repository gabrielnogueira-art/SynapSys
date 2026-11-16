import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  INITIAL_CHANGE_REQUESTS,
  INITIAL_CONTRACTS,
  INITIAL_PLATFORM_USERS,
} from "@/contracts/registry";
import { ChangeRequest, ContractStatus, ModuleId, PlatformContract, PlatformUser, ProjectSegment } from "./types";
import { slugifyContractFolder } from "./catalog";
import { contractEntryPath, normalizeContractSlug, validateContractSlug } from "./contractLinks";

const db = supabase as any;
const LEGACY_KEY = "gestao_plataforma_hub_v1";
const STORE_EVENT = "platform-store-updated";

interface LocalFallbackStore {
  contracts: PlatformContract[];
  users: PlatformUser[];
  changeRequests: ChangeRequest[];
  deletedContractIds?: string[];
  deletedUserIds?: string[];
  deletedRequestIds?: string[];
}

function getLocalFallbackSeeds(): LocalFallbackStore {
  return {
    contracts: INITIAL_CONTRACTS,
    users: INITIAL_PLATFORM_USERS,
    changeRequests: INITIAL_CHANGE_REQUESTS,
    deletedContractIds: [],
    deletedUserIds: [],
    deletedRequestIds: [],
  };
}

function readLocalFallback(): LocalFallbackStore | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LocalFallbackStore>;
    return {
      contracts: Array.isArray(parsed.contracts) ? parsed.contracts : [],
      users: Array.isArray(parsed.users) ? parsed.users : [],
      changeRequests: Array.isArray(parsed.changeRequests) ? parsed.changeRequests : [],
      deletedContractIds: Array.isArray(parsed.deletedContractIds) ? parsed.deletedContractIds : [],
      deletedUserIds: Array.isArray(parsed.deletedUserIds) ? parsed.deletedUserIds : [],
      deletedRequestIds: Array.isArray(parsed.deletedRequestIds) ? parsed.deletedRequestIds : [],
    };
  } catch {
    return null;
  }
}

function writeLocalFallback(next: LocalFallbackStore) {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

function getWritableLocalStore(): LocalFallbackStore {
  return readLocalFallback() ?? getLocalFallbackSeeds();
}

async function isCurrentUserSupabaseMaster(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return false;
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", uid)
    .eq("role", "master")
    .maybeSingle();
  return !!data;
}

export interface PlatformState {
  contracts: PlatformContract[];
  users: PlatformUser[];
  changeRequests: ChangeRequest[];
  loading: boolean;
  error: string | null;
}

export interface NewContractInput {
  slug?: string;
  requireLoginOnEntry?: boolean;
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

let snapshot: PlatformState = { contracts: [], users: [], changeRequests: [], loading: true, error: null };
const listeners = new Set<(s: PlatformState) => void>();
let inflight: Promise<void> | null = null;
const emit = (s: PlatformState) => { snapshot = s; listeners.forEach((l) => l(s)); };

const rowToContract = (r: any, publicOnly = false): PlatformContract => ({
  ...(r.data ?? {}),
  id: r.id,
  code: r.code ?? r.data?.code,
  codeFolder: `src/contracts/${r.id}`,
  entryPath: contractEntryPath({ id: r.id, slug: r.data?.slug }),
  authSource: "supabase",
  supabaseMinistryId: publicOnly ? undefined : r.ministry_id,
  isReferenceExample: r.id === "ctr-001-ebd-exemplo",
  createdAt: String(r.created_at ?? r.data?.createdAt ?? "").slice(0, 10),
});

export async function reloadPlatformStore() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      const map = new Map<string, PlatformContract>();

      const pub = await db.from("platform_contract_directory").select("id,data,created_at");
      if (!pub.error) {
        (pub.data ?? []).forEach((r: any) =>
          map.set(r.id, rowToContract({ ...r, code: r.data?.code }, true))
        );
      }

      let users: PlatformUser[] = [];
      let changeRequests: ChangeRequest[] = [];
      let isMaster = false;

      if (session.session && uid) {
        const [{ data: masterRow }, c, m, q] = await Promise.all([
          db.from("user_roles").select("role").eq("user_id", uid).eq("role", "master").maybeSingle(),
          db.from("platform_contracts").select("*"),
          db.from("platform_memberships").select("*"),
          db.from("platform_requests").select("*").order("created_at", { ascending: false }),
        ]);
        isMaster = !!masterRow;
        if (!c.error) {
          (c.data ?? []).forEach((r: any) => map.set(r.id, rowToContract(r)));
        }
        if (!m.error) {
          users = (m.data ?? []).map((r: any) => ({
            id: r.id, name: r.data?.name || r.data?.email || "Usuário", email: r.data?.email || "",
            contractId: r.contract_id, roleLabel: r.data?.roleLabel || r.access_level, accessLevel: r.access_level,
            authSource: "supabase", status: r.status, notes: r.data?.notes, createdAt: String(r.created_at).slice(0, 10),
          }));
        }
        if (!q.error) {
          changeRequests = (q.data ?? []).map((r: any) => ({
            ...r.data,
            id: r.id,
            contractId: r.contract_id,
            createdAt: String(r.created_at).slice(0, 10),
          }));
        }
      }

      // No modo de acesso direto (sem login Master no Supabase), mescla os modelos e edições locais
      if (!isMaster) {
        const stored = readLocalFallback();
        const fallback = stored ?? getLocalFallbackSeeds();
        const deletedContracts = new Set(fallback.deletedContractIds ?? []);
        const deletedUsers = new Set(fallback.deletedUserIds ?? []);
        const deletedRequests = new Set(fallback.deletedRequestIds ?? []);

        deletedContracts.forEach((id) => map.delete(id));
        fallback.contracts.forEach((c) => {
          if (deletedContracts.has(c.id)) return;
          if (!map.has(c.id)) {
            const existing = map.get(c.id);
            map.set(c.id, existing ? { ...existing, ...c } : c);
          }
        });

        const userMap = new Map<string, PlatformUser>();
        users.forEach((u) => {
          if (!deletedUsers.has(u.id)) userMap.set(u.id, u);
        });
        fallback.users.forEach((u) => {
          if (!deletedUsers.has(u.id) && !userMap.has(u.id)) {
            userMap.set(u.id, u);
          }
        });
        users = [...userMap.values()];

        const reqMap = new Map<string, ChangeRequest>();
        changeRequests.forEach((r) => {
          if (!deletedRequests.has(r.id)) reqMap.set(r.id, r);
        });
        fallback.changeRequests.forEach((r) => {
          if (!deletedRequests.has(r.id) && !reqMap.has(r.id)) {
            reqMap.set(r.id, r);
          }
        });
        changeRequests = [...reqMap.values()];
      }

      const contracts = [...map.values()].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      emit({ contracts, users, changeRequests, loading: false, error: null });
    } catch (e: any) {
      console.error("[Plataforma] Falha ao carregar dados:", e);
      emit({ ...snapshot, loading: false, error: e?.message ?? "Falha ao carregar a plataforma" });
    } finally { inflight = null; }
  })();
  return inflight;
}

let initialized = false;
function init() {
  if (initialized) return;
  initialized = true;
  reloadPlatformStore();
  supabase.auth.onAuthStateChange(() => { setTimeout(reloadPlatformStore, 0); });
  window.addEventListener(STORE_EVENT, () => reloadPlatformStore());
}

export function getContractById(contractId: string) {
  return snapshot.contracts.find((c) => c.id === contractId || c.slug === contractId);
}

const check = (res: { error: any }) => { if (res.error) throw new Error(res.error.message); };
const contractData = (c: Partial<PlatformContract>) => {
  const { id, code, codeFolder, entryPath, authSource, supabaseMinistryId, isReferenceExample, createdAt, ...data } = c as any;
  return data;
};
async function callUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("platform-users", { body });
  if (error) {
    const ctx = await (error as any).context?.json?.().catch(() => null);
    throw new Error(ctx?.error ?? error.message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export function hasLegacyPlatformData() {
  try { return !!localStorage.getItem(LEGACY_KEY); } catch { return false; }
}

export function usePlatformStore() {
  init();
  const [state, setState] = useState(snapshot);
  useEffect(() => {
    listeners.add(setState);
    setState(snapshot);
    const ch = db.channel(`platform-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_contracts" }, () => reloadPlatformStore())
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_memberships" }, () => reloadPlatformStore())
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_requests" }, () => reloadPlatformStore())
      .subscribe();
    return () => { listeners.delete(setState); supabase.removeChannel(ch); };
  }, []);

  const done = async () => reloadPlatformStore();

  const addContract = async (input: NewContractInput): Promise<PlatformContract> => {
    if (!(await isCurrentUserSupabaseMaster())) throw new Error("Entre com a conta Master para criar contratos.");
    const slug = validateContractSlug(input.slug || normalizeContractSlug(input.clientName));
    const nextNum = snapshot.contracts.reduce((max, c) => Math.max(max, parseInt(c.code.match(/(\d+)/)?.[1] ?? "0", 10)), 0) + 1;
    const code = `CTR-${String(nextNum).padStart(3, "0")}`;
    const id = slugifyContractFolder(code, input.clientName);
    const data = {
      slug, requireLoginOnEntry: input.requireLoginOnEntry ?? false,
      clientName: input.clientName.trim(), segment: input.segment, status: input.status, activeModules: input.activeModules,
      city: input.city?.trim() || undefined, responsibleName: input.responsibleName?.trim() || undefined,
      responsibleEmail: input.responsibleEmail?.trim() || undefined, planName: input.planName?.trim() || undefined,
      monthlyValue: input.monthlyValue, notes: input.notes?.trim() || undefined, branding: {},
    };
    if (await isCurrentUserSupabaseMaster()) {
      check(await db.rpc("create_platform_contract", { _id: id, _code: code, _data: data }));
      await done();
      const created = getContractById(id);
      if (!created) throw new Error("Contrato salvo; recarregue a lista para consultá-lo");
      return created;
    }

    const created: PlatformContract = {
      ...data,
      id,
      code,
      codeFolder: `src/contracts/${id}`,
      entryPath: contractEntryPath({ id, slug }),
      authSource: "local",
      createdAt: new Date().toISOString().slice(0, 10),
    };
    const local = getWritableLocalStore();
    local.contracts = [created, ...local.contracts.filter((c) => c.id !== id)];
    local.deletedContractIds = (local.deletedContractIds ?? []).filter((d) => d !== id);
    if (created.responsibleEmail) {
      local.users = [
        {
          id: `usr-${Date.now()}`,
          name: created.responsibleName || created.clientName,
          email: created.responsibleEmail,
          contractId: created.id,
          roleLabel: created.segment === "igreja" ? "Gestor da Igreja" : "Gestor Comercial",
          accessLevel: "gestor_contrato",
          authSource: "local",
          status: "ativo",
          createdAt: created.createdAt,
        },
        ...local.users,
      ];
    }
    writeLocalFallback(local);
    await done();
    return created;
  };

  const updateContract = async (contractId: string, patch: Partial<PlatformContract>) => {
    if (!(await isCurrentUserSupabaseMaster())) throw new Error("Entre com a conta Master para editar contratos.");
    if (patch.slug) patch = { ...patch, slug: validateContractSlug(patch.slug) };
    const current = getContractById(contractId);
    if (!current) throw new Error("Contrato não encontrado");
    if (await isCurrentUserSupabaseMaster()) {
      check(await db.from("platform_contracts").update({ data: contractData({ ...current, ...patch }) }).eq("id", contractId));
      await done();
      return;
    }
    const local = getWritableLocalStore();
    const updated = { ...current, ...patch };
    const exists = local.contracts.some((c) => c.id === contractId);
    local.contracts = exists
      ? local.contracts.map((c) => (c.id === contractId ? updated : c))
      : [updated, ...local.contracts];
    writeLocalFallback(local);
    await done();
  };

  const deleteContract = async (contractId: string) => {
    if (await isCurrentUserSupabaseMaster()) {
      check(await db.from("platform_contracts").delete().eq("id", contractId));
      await done();
      return;
    }
    const local = getWritableLocalStore();
    local.contracts = local.contracts.filter((c) => c.id !== contractId);
    local.users = local.users.filter((u) => u.contractId !== contractId);
    local.changeRequests = local.changeRequests.filter((r) => r.contractId !== contractId);
    local.deletedContractIds = [...new Set([...(local.deletedContractIds ?? []), contractId])];
    writeLocalFallback(local);
    await done();
  };

  const addUser = async (input: Omit<PlatformUser, "id" | "createdAt"> & { password: string }) => {
    const { data: s } = await supabase.auth.getSession();
    if (s.session) {
      await callUsers({ action: "create", ...input });
      await done();
      return;
    }
    const { password: _ignored, ...safeInput } = input;
    const local = getWritableLocalStore();
    local.users = [
      {
        ...safeInput,
        id: `usr-${Date.now()}`,
        authSource: "local",
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...local.users,
    ];
    writeLocalFallback(local);
    await done();
  };

  const updateUserStatus = async (userId: string, status: PlatformUser["status"]) => {
    const { data: s } = await supabase.auth.getSession();
    if (s.session && !userId.startsWith("usr-")) {
      await callUsers({ action: "status", membership_id: userId, status });
      await done();
      return;
    }
    const local = getWritableLocalStore();
    local.users = local.users.map((u) => (u.id === userId ? { ...u, status } : u));
    writeLocalFallback(local);
    await done();
  };

  const deleteUser = async (userId: string) => {
    const { data: s } = await supabase.auth.getSession();
    if (s.session && !userId.startsWith("usr-")) {
      await callUsers({ action: "remove", membership_id: userId });
      await done();
      return;
    }
    const local = getWritableLocalStore();
    local.users = local.users.filter((u) => u.id !== userId);
    local.deletedUserIds = [...new Set([...(local.deletedUserIds ?? []), userId])];
    writeLocalFallback(local);
    await done();
  };

  const addChangeRequest = async (input: Omit<ChangeRequest, "id" | "createdAt" | "status">) => {
    if (await isCurrentUserSupabaseMaster()) {
      const { data: s } = await supabase.auth.getSession();
      check(await db.from("platform_requests").insert({
        contract_id: input.contractId, created_by: s.session?.user.id,
        data: { title: input.title, description: input.description, targetModule: input.targetModule, status: "solicitado" },
      }));
      await done();
      return;
    }
    const local = getWritableLocalStore();
    local.changeRequests = [
      {
        ...input,
        id: `req-${Date.now()}`,
        status: "solicitado",
        createdAt: new Date().toISOString().slice(0, 10),
      },
      ...local.changeRequests,
    ];
    writeLocalFallback(local);
    await done();
  };

  const updateChangeRequestStatus = async (requestId: string, status: ChangeRequest["status"]) => {
    const r = snapshot.changeRequests.find((x) => x.id === requestId);
    if (!r) return;
    if (await isCurrentUserSupabaseMaster() && !requestId.startsWith("req-")) {
      const { id, contractId, createdAt, ...data } = r;
      check(await db.from("platform_requests").update({ data: { ...data, status } }).eq("id", requestId));
      await done();
      return;
    }
    const local = getWritableLocalStore();
    local.changeRequests = local.changeRequests.map((x) =>
      x.id === requestId ? { ...x, status } : x
    );
    writeLocalFallback(local);
    await done();
  };

  const deleteChangeRequest = async (requestId: string) => {
    if (await isCurrentUserSupabaseMaster() && !requestId.startsWith("req-")) {
      check(await db.from("platform_requests").delete().eq("id", requestId));
      await done();
      return;
    }
    const local = getWritableLocalStore();
    local.changeRequests = local.changeRequests.filter((x) => x.id !== requestId);
    local.deletedRequestIds = [...new Set([...(local.deletedRequestIds ?? []), requestId])];
    writeLocalFallback(local);
    await done();
  };

  /** Importa contratos/solicitações antigos salvos apenas neste navegador. Não cria logins. */
  const importLegacyBrowserData = async () => {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    const existing = new Set(snapshot.contracts.map((c) => c.id));
    const toAdd = (parsed.contracts ?? []).filter((c: PlatformContract) => c?.id && !existing.has(c.id));
    if (toAdd.length) check(await db.from("platform_contracts").insert(toAdd.map((c: PlatformContract) => ({ id: c.id, code: c.code, data: contractData(c) }))));
    const ids = new Set([...existing, ...toAdd.map((c: PlatformContract) => c.id)]);
    const reqs = (parsed.changeRequests ?? []).filter((r: ChangeRequest) => ids.has(r.contractId) && !String(r.id).startsWith("req-1") && !String(r.id).startsWith("req-2"));
    for (const r of reqs) await addChangeRequest(r);
    localStorage.removeItem(LEGACY_KEY);
    await done();
    return toAdd.length;
  };

  return {
    ...state, addContract, updateContract, deleteContract, addUser, updateUserStatus, deleteUser,
    updateBranding: async (contractId: string, branding: PlatformContract["branding"]) => {
      await callUsers({ action: "branding", contractId, branding });
      await done();
    },
    addChangeRequest, updateChangeRequestStatus, deleteChangeRequest, importLegacyBrowserData, reload: reloadPlatformStore,
    toggleContractModule: async (contractId: string, moduleId: ModuleId) => {
      const c = getContractById(contractId);
      if (!c) return;
      const has = c.activeModules.includes(moduleId);
      const next = has ? c.activeModules.filter((m) => m !== moduleId) : [...c.activeModules, moduleId];
      if (next.length) await updateContract(contractId, { activeModules: next });
    },
  };
}
