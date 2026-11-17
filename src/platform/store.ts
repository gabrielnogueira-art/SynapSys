import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  ChangeRequest,
  ContractActivityEntry,
  ContractClauseTemplate,
  ContractInvoice,
  ContractLegalStatus,
  ContractStatus,
  InvoicePaymentMethod,
  ModuleId,
  PendingAccessRequest,
  PlatformBillingConfig,
  PlatformContract,
  PlatformUser,
  PricingTier,
  ProjectSegment,
  UserAccessLevel,
} from "./types";
import { slugifyContractFolder } from "./catalog";
import { PLATFORM_ACCESS_EVENT } from "./useContractAccess";
import {
  contractEntryPath,
  normalizeContractSlug,
  normalizeOriginConfig,
  type PlatformOriginConfig,
  setPlatformOriginConfig,
  validateContractSlug,
  validatePublicAppOrigin,
} from "./contractLinks";
import {
  buildDueDateForCompetence,
  DEFAULT_BILLING_CONFIG,
  DEFAULT_CONTRACT_CLAUSES,
  DEFAULT_PRICING_TIERS,
  normalizeBillingConfig,
  normalizeClauseTemplates,
  normalizePricingTiers,
  roundCurrency,
  todayIsoDate,
} from "./saasDefaults";

const LEGACY_KEY = "gestao_plataforma_hub_v1";
const STORE_EVENT = "platform-store-updated";

interface ContractRowShape {
  id?: string | null;
  code?: string | null;
  ministry_id?: string | null;
  created_at?: string | null;
  data?: Json | null;
}

const asRecord = (val: unknown): Record<string, unknown> =>
  val && typeof val === "object" && !Array.isArray(val)
    ? (val as Record<string, unknown>)
    : {};

interface LocalFallbackStore {
  contracts: PlatformContract[];
  users: PlatformUser[];
  changeRequests: ChangeRequest[];
  deletedContractIds?: string[];
  deletedUserIds?: string[];
  deletedRequestIds?: string[];
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

async function isCurrentUserSupabaseMaster(): Promise<boolean> {
  const { data: sessionData } = await supabase.auth.getSession();
  const uid = sessionData.session?.user?.id;
  if (!uid) return false;
  const { data } = await supabase
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
  pendingRequests: PendingAccessRequest[];
  changeRequests: ChangeRequest[];
  pricingTiers: PricingTier[];
  clauseTemplates: ContractClauseTemplate[];
  billingConfig: PlatformBillingConfig;
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
  legalName?: string;
  documentNumber?: string;
  address?: string;
  unitsCount?: number;
  billingDueDay?: number;
  contractStartDate?: string;
  adjustmentIndex?: string;
  contractLegalStatus?: ContractLegalStatus;
  notes?: string;
}

let snapshot: PlatformState = {
  contracts: [],
  users: [],
  pendingRequests: [],
  changeRequests: [],
  pricingTiers: DEFAULT_PRICING_TIERS,
  clauseTemplates: DEFAULT_CONTRACT_CLAUSES,
  billingConfig: DEFAULT_BILLING_CONFIG,
  loading: true,
  error: null,
};
const listeners = new Set<(s: PlatformState) => void>();
let inflight: Promise<void> | null = null;
const emit = (s: PlatformState) => { snapshot = s; listeners.forEach((l) => l(s)); };

const rowToContract = (r: ContractRowShape, publicOnly = false): PlatformContract => {
  const raw = asRecord(r.data) as Partial<PlatformContract>;
  const id = String(r.id ?? raw.id ?? "");
  return {
    ...raw,
    id,
    code: String(r.code ?? raw.code ?? id),
    clientName: String(raw.clientName ?? ""),
    segment: raw.segment === "comercio" ? "comercio" : "igreja",
    status: raw.status ?? "ativo",
    activeModules: Array.isArray(raw.activeModules) ? raw.activeModules : [],
    codeFolder: `src/contracts/${id}`,
    entryPath: contractEntryPath({ id, slug: raw.slug }),
    authSource: "supabase",
    supabaseMinistryId: publicOnly ? undefined : r.ministry_id,
    isReferenceExample: id === "ctr-001-ebd-exemplo",
    createdAt: String(r.created_at ?? raw.createdAt ?? "").slice(0, 10),
  };
};

export async function reloadPlatformStore() {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      const map = new Map<string, PlatformContract>();

      const addPublic = (rows: ContractRowShape[] | null) =>
        (rows ?? []).forEach((r) => {
          if (!r.id) return;
          const d = asRecord(r.data);
          map.set(
            r.id,
            rowToContract({ ...r, code: typeof d.code === "string" ? d.code : undefined }, true)
          );
        });
      if (uid) {
        const pub = await supabase.from("platform_contract_directory").select("id,data,created_at");
        if (!pub.error) addPublic(pub.data);
      }
      const linkKey =
        typeof window !== "undefined"
          ? decodeURIComponent(window.location.pathname.match(/^\/c\/([^/]+)/)?.[1] ?? "")
          : "";
      if (linkKey) {
        const one = await supabase.rpc("resolve_contract_directory", { _key: linkKey });
        if (!one.error) addPublic(one.data);
      }

      let users: PlatformUser[] = [];
      let pendingRequests: PendingAccessRequest[] = [];
      let changeRequests: ChangeRequest[] = [];
      let pricingTiers = snapshot.pricingTiers;
      let clauseTemplates = snapshot.clauseTemplates;
      let billingConfig = snapshot.billingConfig;

      if (session.session && uid) {
        const [c, m, q, masterRow, p] = await Promise.all([
          supabase.from("platform_contracts").select("*"),
          supabase.from("platform_memberships").select("*"),
          supabase.from("platform_requests").select("*").order("created_at", { ascending: false }),
          supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "master").maybeSingle(),
          supabase.from("pending_users").select("*").eq("status", "pending").order("created_at", { ascending: false }),
        ]);
        if (!masterRow.error && masterRow.data) {
          const settingsRes = await supabase
            .from("system_settings")
            .select("key, value")
            .in("key", [
              "platform_public_origin",
              "platform_pricing_tiers",
              "platform_contract_clauses",
              "platform_billing_config",
            ]);
          if (!settingsRes.error && Array.isArray(settingsRes.data)) {
            for (const row of settingsRes.data) {
              if (row.key === "platform_public_origin" && row.value) {
                setPlatformOriginConfig(normalizeOriginConfig(row.value));
              } else if (row.key === "platform_pricing_tiers") {
                pricingTiers = normalizePricingTiers(row.value);
              } else if (row.key === "platform_contract_clauses") {
                clauseTemplates = normalizeClauseTemplates(row.value);
              } else if (row.key === "platform_billing_config") {
                billingConfig = normalizeBillingConfig(row.value);
              }
            }
          }
        }
        if (!c.error) {
          (c.data ?? []).forEach((r) => map.set(r.id, rowToContract(r)));
        }
        if (!m.error) {
          users = (m.data ?? []).map((r) => {
            const d = asRecord(r.data);
            const ctr = map.get(r.contract_id);
            const emailStr = typeof d.email === "string" ? d.email : "";
            const emailLower = emailStr.toLowerCase();
            const overrideModules =
              ctr?.memberModuleOverrides?.[r.id] ??
              (emailLower ? ctr?.memberModuleOverrides?.[emailLower] : undefined);
            const allowedModules =
              Array.isArray(d.allowedModules) && d.allowedModules.length > 0
                ? (d.allowedModules as ModuleId[])
                : Array.isArray(overrideModules) && overrideModules.length > 0
                ? overrideModules
                : undefined;
            const overrideLevels =
              ctr?.memberModuleLevelOverrides?.[r.id] ??
              (emailLower ? ctr?.memberModuleLevelOverrides?.[emailLower] : undefined);
            const moduleLevels =
              d.moduleLevels && typeof d.moduleLevels === "object"
                ? (d.moduleLevels as Partial<Record<ModuleId, string>>)
                : overrideLevels;
            return {
              id: r.id,
              name: (typeof d.name === "string" && d.name) || emailStr || "Usuário",
              email: emailStr,
              contractId: r.contract_id,
              roleLabel: (typeof d.roleLabel === "string" && d.roleLabel) || r.access_level,
              accessLevel: r.access_level as UserAccessLevel,
              authSource: "supabase" as const,
              status: (r.status === "pendente" || r.status === "bloqueado" ? r.status : "ativo") as PlatformUser["status"],
              allowedModules,
              moduleLevels,
              ebdAdmin: typeof d.ebdAdmin === "boolean" ? d.ebdAdmin : r.access_level === "gestor_contrato",
              notes: typeof d.notes === "string" ? d.notes : undefined,
              createdAt: String(r.created_at).slice(0, 10),
            };
          });
        }
        if (!p.error) {
          pendingRequests = (p.data ?? []).map((r) => ({
            id: r.id,
            userId: r.user_id ?? null,
            email: r.email,
            displayName: r.display_name || r.email,
            contractId: r.contract_id ?? null,
            requestedArea: r.requested_area ?? null,
            notes: r.notes ?? null,
            status: (r.status === "approved" || r.status === "rejected" ? r.status : "pending") as PendingAccessRequest["status"],
            createdAt: String(r.created_at).slice(0, 10),
          }));
        }
        if (!q.error) {
          changeRequests = (q.data ?? []).map((r) => {
            const d = asRecord(r.data) as Partial<ChangeRequest>;
            return {
              title: String(d.title ?? ""),
              description: String(d.description ?? ""),
              targetModule: d.targetModule ?? "geral",
              status: d.status ?? "solicitado",
              id: r.id,
              contractId: r.contract_id,
              createdAt: String(r.created_at).slice(0, 10),
            };
          });
        }
      }

      const contracts = [...map.values()].sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
      emit({
        contracts,
        users,
        pendingRequests,
        changeRequests,
        pricingTiers,
        clauseTemplates,
        billingConfig,
        loading: false,
        error: null,
      });
    } catch (e: unknown) {
      console.error("[Plataforma] Falha ao carregar dados:", e);
      emit({
        ...snapshot,
        loading: false,
        error: e instanceof Error ? e.message : "Falha ao carregar a plataforma",
      });
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

const check = (res: { error: { message: string } | null }) => {
  if (res.error) throw new Error(res.error.message);
};
const contractData = (c: Partial<PlatformContract>): Json => {
  const {
    id: _id,
    code: _code,
    codeFolder: _codeFolder,
    entryPath: _entryPath,
    authSource: _authSource,
    supabaseMinistryId: _ministryId,
    isReferenceExample: _isRef,
    createdAt: _createdAt,
    ...data
  } = c;
  return data as unknown as Json;
};
async function callUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("platform-users", { body });
  if (error) {
    const errObj = error as {
      message: string;
      context?: { json?: () => Promise<{ error?: string } | null> };
    };
    const ctx = await errObj.context?.json?.().catch(() => null);
    throw new Error(ctx?.error ?? errObj.message);
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
    const ch = supabase.channel(`platform-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_contracts" }, () => reloadPlatformStore())
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_memberships" }, () => reloadPlatformStore())
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_requests" }, () => reloadPlatformStore())
      .subscribe();
    return () => { listeners.delete(setState); supabase.removeChannel(ch); };
  }, []);

  const done = async () => reloadPlatformStore();

  const makeActivity = (
    type: ContractActivityEntry["type"],
    summary: string
  ): ContractActivityEntry => ({
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    type,
    summary,
  });

  const appendActivity = (
    list: ContractActivityEntry[] | undefined,
    entry: ContractActivityEntry
  ): ContractActivityEntry[] => [entry, ...(list ?? [])].slice(0, 60);

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
      monthlyValue: input.monthlyValue,
      legalName: input.legalName?.trim() || undefined,
      documentNumber: input.documentNumber?.trim() || undefined,
      address: input.address?.trim() || undefined,
      unitsCount: input.unitsCount ?? 1,
      billingDueDay: input.billingDueDay ?? 10,
      contractStartDate: input.contractStartDate || todayIsoDate(),
      adjustmentIndex: input.adjustmentIndex?.trim() || "IPCA",
      contractLegalStatus:
        input.contractLegalStatus || (input.status === "ativo" ? "ativo" : "em_elaboracao"),
      invoices: [],
      activityLog: [makeActivity("contrato", `Contrato ${code} criado (${input.unitsCount ?? 1} unidade(s))`)],
      notes: input.notes?.trim() || undefined, branding: {},
    };
    check(await supabase.rpc("create_platform_contract", { _id: id, _code: code, _data: contractData(data) }));
    await done();
    const created = getContractById(id);
    if (!created) throw new Error("Contrato salvo; recarregue a lista para consultá-lo");
    return created;
  };

  const requireMaster = async () => {
    if (!(await isCurrentUserSupabaseMaster())) throw new Error("Entre com a conta Master para gerenciar contratos.");
  };
  const updateContract = async (contractId: string, patch: Partial<PlatformContract>) => {
    await requireMaster();
    if ("slug" in patch) {
      patch = {
        ...patch,
        slug: patch.slug?.trim() ? validateContractSlug(patch.slug) : "",
      };
    }
    const current = getContractById(contractId);
    if (!current) throw new Error("Contrato não encontrado");
    let nextActivityLog = patch.activityLog ?? current.activityLog;
    if (!patch.activityLog) {
      const notes: string[] = [];
      if (patch.status && patch.status !== current.status) {
        notes.push(`Status alterado: ${current.status} → ${patch.status}`);
      }
      if (patch.contractLegalStatus && patch.contractLegalStatus !== current.contractLegalStatus) {
        notes.push(`Status contratual: ${patch.contractLegalStatus}`);
      }
      if (typeof patch.unitsCount === "number" && patch.unitsCount !== (current.unitsCount ?? 1)) {
        notes.push(`Unidades: ${current.unitsCount ?? 1} → ${patch.unitsCount}`);
      }
      if (typeof patch.monthlyValue === "number" && patch.monthlyValue !== current.monthlyValue) {
        notes.push(`Mensalidade atualizada para R$ ${patch.monthlyValue.toFixed(2)}`);
      }
      if (notes.length > 0) {
        nextActivityLog = appendActivity(nextActivityLog, makeActivity("plano", notes.join(" • ")));
      }
    }
    check(await supabase.from("platform_contracts").update({ data: contractData({ ...current, ...patch, activityLog: nextActivityLog }) }).eq("id", contractId));
    await done();
  };
  const deleteContract = async (contractId: string) => {
    await requireMaster();
    check(await supabase.from("platform_contracts").delete().eq("id", contractId));
    await done();
  };
  const addUser = async (input: Omit<PlatformUser, "id" | "createdAt"> & { password: string }) => {
    await callUsers({ action: "create", ...input });
    await done();
    const needsFallbackModules = Boolean(input.allowedModules && input.allowedModules.length > 0);
    const needsFallbackLevels = Boolean(input.moduleLevels && Object.keys(input.moduleLevels).length > 0);
    if ((needsFallbackModules || needsFallbackLevels) && (await isCurrentUserSupabaseMaster())) {
      const created = snapshot.users.find(
        (u) => u.contractId === input.contractId && u.email.toLowerCase() === input.email.trim().toLowerCase()
      );
      const contract = getContractById(input.contractId);
      if (created && contract) {
        let dirty = false;
        const nextContract = { ...contract };
        if (needsFallbackModules && (!created.allowedModules || created.allowedModules.length === 0)) {
          nextContract.memberModuleOverrides = {
            ...(contract.memberModuleOverrides ?? {}),
            [created.id]: input.allowedModules!,
          };
          dirty = true;
        }
        if (needsFallbackLevels && (!created.moduleLevels || Object.keys(created.moduleLevels).length === 0)) {
          nextContract.memberModuleLevelOverrides = {
            ...(contract.memberModuleLevelOverrides ?? {}),
            [created.id]: input.moduleLevels!,
          };
          dirty = true;
        }
        if (dirty) {
          await supabase
            .from("platform_contracts")
            .update({ data: contractData(nextContract) })
            .eq("id", contract.id);
          await done();
        }
      }
    }
    window.dispatchEvent(new Event(PLATFORM_ACCESS_EVENT));
  };
  const updateUserAccess = async (input: {
    membershipId: string;
    contractId: string;
    email: string;
    roleLabel: string;
    accessLevel: UserAccessLevel;
    allowedModules?: ModuleId[];
    moduleLevels?: Partial<Record<ModuleId, string>>;
    ebdAdmin?: boolean;
  }) => {
    let remoteOk = false;
    try {
      await callUsers({
        action: "update_access",
        membership_id: input.membershipId,
        roleLabel: input.roleLabel,
        accessLevel: input.accessLevel,
        allowedModules: input.allowedModules && input.allowedModules.length > 0 ? input.allowedModules : null,
        moduleLevels: input.moduleLevels ?? null,
        ebdAdmin: input.ebdAdmin,
      });
      remoteOk = true;
    } catch (err) {
      const isMaster = await isCurrentUserSupabaseMaster();
      if (!isMaster) throw err;
    }

    if (!remoteOk) {
      const contract = getContractById(input.contractId);
      if (!contract) throw new Error("Contrato não encontrado");
      const nextOverrides = { ...(contract.memberModuleOverrides ?? {}) };
      if (input.allowedModules && input.allowedModules.length > 0) {
        nextOverrides[input.membershipId] = input.allowedModules;
      } else {
        delete nextOverrides[input.membershipId];
        if (input.email) delete nextOverrides[input.email.toLowerCase()];
      }
      const nextLevelOverrides = { ...(contract.memberModuleLevelOverrides ?? {}) };
      if (input.moduleLevels && Object.keys(input.moduleLevels).length > 0) {
        nextLevelOverrides[input.membershipId] = input.moduleLevels;
      } else {
        delete nextLevelOverrides[input.membershipId];
        if (input.email) delete nextLevelOverrides[input.email.toLowerCase()];
      }
      check(
        await supabase
          .from("platform_contracts")
          .update({
            data: contractData({
              ...contract,
              memberModuleOverrides: nextOverrides,
              memberModuleLevelOverrides: nextLevelOverrides,
            }),
          })
          .eq("id", contract.id)
      );
    }

    await done();
    window.dispatchEvent(new Event(PLATFORM_ACCESS_EVENT));
  };
  const approvePendingUser = async (input: {
    pendingId: string;
    contractId: string;
    accessLevel: UserAccessLevel;
    roleLabel: string;
    allowedModules?: ModuleId[];
    moduleLevels?: Partial<Record<ModuleId, string>>;
    ebdAdmin?: boolean;
  }) => {
    await callUsers({
      action: "approve_pending",
      pending_id: input.pendingId,
      contractId: input.contractId,
      accessLevel: input.accessLevel,
      roleLabel: input.roleLabel,
      allowedModules: input.allowedModules && input.allowedModules.length > 0 ? input.allowedModules : null,
      moduleLevels: input.moduleLevels ?? null,
      ebdAdmin: input.ebdAdmin,
    });
    await done();
    window.dispatchEvent(new Event(PLATFORM_ACCESS_EVENT));
  };
  const rejectPendingUser = async (pendingId: string) => {
    await callUsers({ action: "reject_pending", pending_id: pendingId });
    await done();
  };
  const updateUserStatus = async (userId: string, status: PlatformUser["status"]) => {
    await callUsers({ action: "status", membership_id: userId, status });
    await done();
  };
  const deleteUser = async (userId: string) => {
    await callUsers({ action: "remove", membership_id: userId });
    await done();
  };
  const addChangeRequest = async (input: Omit<ChangeRequest, "id" | "createdAt" | "status">) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new Error("Entre para enviar solicitações.");
    check(await supabase.from("platform_requests").insert({
      contract_id: input.contractId, created_by: data.user.id,
      data: { title: input.title, description: input.description, targetModule: input.targetModule, status: "solicitado" } as unknown as Json,
    }));
    await done();
  };
  const updateChangeRequestStatus = async (requestId: string, status: ChangeRequest["status"]) => {
    await requireMaster();
    const request = snapshot.changeRequests.find((r) => r.id === requestId);
    if (!request) throw new Error("Solicitação não encontrada");
    const { id: _id, contractId: _contractId, createdAt: _createdAt, ...data } = request;
    check(await supabase.from("platform_requests").update({ data: { ...data, status } as unknown as Json }).eq("id", requestId));
    await done();
  };
  const deleteChangeRequest = async (requestId: string) => {
    await requireMaster();
    check(await supabase.from("platform_requests").delete().eq("id", requestId));
    await done();
  };
  const updatePlatformOrigin = async (next: PlatformOriginConfig) => {
    await requireMaster();
    const normalized: PlatformOriginConfig =
      next.mode === "manual"
        ? { mode: "manual", manualOrigin: validatePublicAppOrigin(next.manualOrigin ?? "") }
        : { mode: "auto", manualOrigin: null };
    check(
      await supabase.from("system_settings").upsert(
        {
          key: "platform_public_origin",
          value: normalized as unknown as Json,
          description: "Domínio base usado para gerar links públicos de contratos",
        },
        { onConflict: "key" }
      )
    );
    setPlatformOriginConfig(normalized);
  };

  const savePricingTiers = async (tiers: PricingTier[]) => {
    await requireMaster();
    const normalized = normalizePricingTiers(tiers);
    check(
      await supabase.from("system_settings").upsert(
        {
          key: "platform_pricing_tiers",
          value: normalized as unknown as Json,
          description: "Faixas de preço por unidade/igreja da plataforma SynapSys",
        },
        { onConflict: "key" }
      )
    );
    emit({ ...snapshot, pricingTiers: normalized });
    await done();
  };

  const saveClauseTemplates = async (clauses: ContractClauseTemplate[]) => {
    await requireMaster();
    const normalized = normalizeClauseTemplates(clauses);
    check(
      await supabase.from("system_settings").upsert(
        {
          key: "platform_contract_clauses",
          value: normalized as unknown as Json,
          description: "Modelo padrão de cláusulas contratuais SaaS da SynapSys",
        },
        { onConflict: "key" }
      )
    );
    emit({ ...snapshot, clauseTemplates: normalized });
    await done();
  };

  const saveBillingConfig = async (config: PlatformBillingConfig) => {
    await requireMaster();
    const normalized = normalizeBillingConfig(config);
    check(
      await supabase.from("system_settings").upsert(
        {
          key: "platform_billing_config",
          value: normalized as unknown as Json,
          description: "Configurações financeiras, PIX, carência e contratada SynapSys",
        },
        { onConflict: "key" }
      )
    );
    emit({ ...snapshot, billingConfig: normalized });
    await done();
  };

  const addContractInvoice = async (
    contractId: string,
    input: Omit<ContractInvoice, "id" | "createdAt">
  ) => {
    await requireMaster();
    const current = getContractById(contractId);
    if (!current) throw new Error("Contrato não encontrado");
    const invoice: ContractInvoice = {
      ...input,
      amount: roundCurrency(input.amount),
      id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: todayIsoDate(),
    };
    const nextInvoices = [invoice, ...(current.invoices ?? [])].sort((a, b) =>
      b.dueDate.localeCompare(a.dueDate)
    );
    const nextLog = appendActivity(
      current.activityLog,
      makeActivity(
        "cobranca",
        `Cobrança ${invoice.competence} emitida (R$ ${invoice.amount.toFixed(2)} • venc. ${invoice.dueDate})`
      )
    );
    await updateContract(contractId, { invoices: nextInvoices, activityLog: nextLog });
    return invoice;
  };

  const updateContractInvoice = async (
    contractId: string,
    invoiceId: string,
    patch: Partial<ContractInvoice>,
    activitySummary?: string
  ) => {
    await requireMaster();
    const current = getContractById(contractId);
    if (!current) throw new Error("Contrato não encontrado");
    const nextInvoices = (current.invoices ?? []).map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            ...patch,
            amount: patch.amount !== undefined ? roundCurrency(patch.amount) : inv.amount,
            paidAmount:
              patch.paidAmount !== undefined ? roundCurrency(patch.paidAmount) : inv.paidAmount,
          }
        : inv
    );
    const summary =
      activitySummary ||
      (patch.status === "pago"
        ? `Pagamento registrado para fatura ${invoiceId}`
        : `Cobrança ${invoiceId} atualizada`);
    const nextLog = appendActivity(current.activityLog, makeActivity("cobranca", summary));
    await updateContract(contractId, { invoices: nextInvoices, activityLog: nextLog });
  };

  const deleteContractInvoice = async (contractId: string, invoiceId: string) => {
    await requireMaster();
    const current = getContractById(contractId);
    if (!current) throw new Error("Contrato não encontrado");
    const removed = (current.invoices ?? []).find((inv) => inv.id === invoiceId);
    const nextInvoices = (current.invoices ?? []).filter((inv) => inv.id !== invoiceId);
    const nextLog = appendActivity(
      current.activityLog,
      makeActivity(
        "cobranca",
        `Cobrança ${removed?.competence ?? invoiceId} removida`
      )
    );
    await updateContract(contractId, { invoices: nextInvoices, activityLog: nextLog });
  };

  const generateCompetenceInvoices = async (
    competence: string,
    provider: InvoicePaymentMethod
  ): Promise<{ createdCount: number; skippedCount: number }> => {
    await requireMaster();
    let createdCount = 0;
    let skippedCount = 0;
    const targets = snapshot.contracts.filter(
      (c) => c.status === "ativo" && typeof c.monthlyValue === "number" && c.monthlyValue > 0
    );
    for (const current of targets) {
      const existing = (current.invoices ?? []).some(
        (inv) => inv.competence === competence && inv.status !== "cancelado"
      );
      if (existing) {
        skippedCount += 1;
        continue;
      }
      const dueDate = buildDueDateForCompetence(competence, current.billingDueDay ?? 10);
      const invoice: ContractInvoice = {
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        competence,
        dueDate,
        amount: roundCurrency(current.monthlyValue ?? 0),
        status: "pendente",
        provider,
        createdAt: todayIsoDate(),
      };
      const nextInvoices = [invoice, ...(current.invoices ?? [])].sort((a, b) =>
        b.dueDate.localeCompare(a.dueDate)
      );
      const nextLog = appendActivity(
        current.activityLog,
        makeActivity(
          "cobranca",
          `Mensalidade ${competence} gerada em lote (R$ ${invoice.amount.toFixed(2)})`
        )
      );
      check(
        await supabase
          .from("platform_contracts")
          .update({
            data: contractData({ ...current, invoices: nextInvoices, activityLog: nextLog }),
          })
          .eq("id", current.id)
      );
      createdCount += 1;
    }
    await done();
    return { createdCount, skippedCount };
  };

  /** Importa contratos/solicitações antigos salvos apenas neste navegador. Não cria logins. */
  const importLegacyBrowserData = async () => {
    await requireMaster();
    const parsed = readLocalFallback();
    if (!parsed) return 0;
    const existing = new Set(snapshot.contracts.map((c) => c.id));
    const toAdd = (parsed.contracts ?? []).filter((c: PlatformContract) => c?.id && !existing.has(c.id));
    for (const c of toAdd) check(await supabase.rpc("create_platform_contract", { _id: c.id, _code: c.code, _data: contractData(c) }));
    const ids = new Set([...existing, ...toAdd.map((c: PlatformContract) => c.id)]);
    const reqs = (parsed.changeRequests ?? []).filter((r: ChangeRequest) => ids.has(r.contractId) && !String(r.id).startsWith("req-1") && !String(r.id).startsWith("req-2"));
    for (const r of reqs) await addChangeRequest(r);
    localStorage.removeItem(LEGACY_KEY);
    await done();
    return toAdd.length;
  };

  return {
    ...state, addContract, updateContract, deleteContract, addUser, updateUserAccess, updateUserStatus, deleteUser, approvePendingUser, rejectPendingUser,
    updateBranding: async (contractId: string, branding: PlatformContract["branding"]) => {
      await callUsers({ action: "branding", contractId, branding });
      await done();
    },
    addChangeRequest, updateChangeRequestStatus, deleteChangeRequest, updatePlatformOrigin,
    savePricingTiers, saveClauseTemplates, saveBillingConfig,
    addContractInvoice, updateContractInvoice, deleteContractInvoice, generateCompetenceInvoices,
    importLegacyBrowserData, reload: reloadPlatformStore,
    toggleContractModule: async (contractId: string, moduleId: ModuleId) => {
      const c = getContractById(contractId);
      if (!c) return;
      const has = c.activeModules.includes(moduleId);
      const next = has ? c.activeModules.filter((m) => m !== moduleId) : [...c.activeModules, moduleId];
      if (next.length) await updateContract(contractId, { activeModules: next });
    },
  };
}
