import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import type { ModuleId } from "./types";

export const PLATFORM_ACCESS_EVENT = "platform-access-updated";

interface MembershipDataShape {
  name?: string;
  roleLabel?: string;
  allowedModules?: ModuleId[];
  moduleLevels?: Partial<Record<ModuleId, string>>;
  assignedCongregation?: string;
}

interface ContractDataShape {
  memberModuleOverrides?: Record<string, ModuleId[]>;
  memberModuleLevelOverrides?: Record<string, Partial<Record<ModuleId, string>>>;
  memberCongregationOverrides?: Record<string, string>;
}

export interface ContractAccessState {
  loading: boolean;
  signedIn: boolean;
  allowed: boolean;
  manager: boolean;
  allowedModules: ModuleId[] | null;
  moduleLevels: Partial<Record<ModuleId, string>> | null;
  assignedCongregation: string | null;
  userEmail: string | null;
  userName: string | null;
  roleLabel: string | null;
}

const EMPTY_ACCESS: ContractAccessState = {
  loading: true,
  signedIn: false,
  allowed: false,
  manager: false,
  allowedModules: null,
  moduleLevels: null,
  assignedCongregation: null,
  userEmail: null,
  userName: null,
  roleLabel: null,
};

interface RoleHierarchyIds {
  ministryId: string | null;
  headquartersId: string | null;
  regionalId: string | null;
  congregationId: string | null;
}

async function resolveRoleMinistryId(roleIds: RoleHierarchyIds): Promise<string | null> {
  if (roleIds.ministryId) return roleIds.ministryId;
  let hqId = roleIds.headquartersId;
  if (!hqId && roleIds.regionalId) {
    const { data } = await supabase
      .from("regionals")
      .select("headquarters_id")
      .eq("id", roleIds.regionalId)
      .maybeSingle();
    hqId = data?.headquarters_id ?? null;
  }
  if (!hqId && roleIds.congregationId) {
    const { data } = await supabase
      .from("congregations")
      .select("headquarters_id")
      .eq("id", roleIds.congregationId)
      .maybeSingle();
    hqId = data?.headquarters_id ?? null;
  }
  if (!hqId) return null;
  const { data } = await supabase
    .from("headquarters")
    .select("ministry_id")
    .eq("id", hqId)
    .maybeSingle();
  return data?.ministry_id ?? null;
}

export function useContractAccess(contractId?: string): ContractAccessState {
  const {
    loading: roleLoading,
    role: roleKind,
    ministryId,
    headquartersId,
    regionalId,
    congregationId,
  } = useUserRole();
  const [access, setAccess] = useState<ContractAccessState>(EMPTY_ACCESS);

  useEffect(() => {
    if (roleLoading) return;
    let active = true;
    setAccess((s) => ({ ...s, loading: true }));

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session) {
        if (active) setAccess({ ...EMPTY_ACCESS, loading: false });
        return;
      }

      const uid = session.user.id;
      const userEmail = session.user.email ?? null;
      const metaName =
        typeof session.user.user_metadata?.display_name === "string"
          ? session.user.user_metadata.display_name
          : null;

      if (roleKind === "master") {
        if (active) {
          setAccess({
            loading: false,
            signedIn: true,
            allowed: true,
            manager: true,
            allowedModules: null,
            moduleLevels: null,
            assignedCongregation: null,
            userEmail,
            userName: metaName || userEmail || "Master",
            roleLabel: "Master / Dono da Plataforma",
          });
        }
        return;
      }

      const { data: rows, error } = await supabase
        .from("platform_memberships")
        .select("id,contract_id,access_level,status,data")
        .eq("user_id", uid)
        .eq("status", "ativo");

      const membership = rows?.find(
        (r) => !contractId || r.contract_id === contractId
      );

      if (!error && membership) {
        const memData =
          membership.data && typeof membership.data === "object" && !Array.isArray(membership.data)
            ? (membership.data as MembershipDataShape)
            : {};

        let allowedModules: ModuleId[] | null =
          Array.isArray(memData.allowedModules) && memData.allowedModules.length > 0
            ? memData.allowedModules
            : null;
        let moduleLevels: Partial<Record<ModuleId, string>> | null =
          memData.moduleLevels && typeof memData.moduleLevels === "object"
            ? memData.moduleLevels
            : null;
        let assignedCongregation: string | null =
          typeof memData.assignedCongregation === "string" &&
          memData.assignedCongregation.trim()
            ? memData.assignedCongregation.trim()
            : null;

        if (!allowedModules || !moduleLevels || !assignedCongregation) {
          const { data: contractRow } = await supabase
            .from("platform_contracts")
            .select("data")
            .eq("id", membership.contract_id)
            .maybeSingle();
          const cData =
            contractRow?.data && typeof contractRow.data === "object" && !Array.isArray(contractRow.data)
              ? (contractRow.data as ContractDataShape)
              : {};
          if (!allowedModules) {
            const overrides = cData.memberModuleOverrides;
            const byId = overrides?.[membership.id];
            const byEmail = userEmail ? overrides?.[userEmail.toLowerCase()] : undefined;
            const resolved = byId?.length ? byId : byEmail?.length ? byEmail : null;
            if (resolved) allowedModules = resolved;
          }
          if (!moduleLevels) {
            const levelOverrides = cData.memberModuleLevelOverrides;
            const resolvedLevels =
              levelOverrides?.[membership.id] ??
              (userEmail ? levelOverrides?.[userEmail.toLowerCase()] : undefined) ??
              null;
            if (resolvedLevels) moduleLevels = resolvedLevels;
          }
          if (!assignedCongregation) {
            const congOverrides = cData.memberCongregationOverrides;
            const resolvedCong =
              congOverrides?.[membership.id] ??
              (userEmail ? congOverrides?.[userEmail.toLowerCase()] : undefined) ??
              null;
            if (typeof resolvedCong === "string" && resolvedCong.trim()) {
              assignedCongregation = resolvedCong.trim();
            }
          }
        }

        const manager = membership.access_level === "gestor_contrato";
        if (active) {
          setAccess({
            loading: false,
            signedIn: true,
            allowed: true,
            manager,
            allowedModules,
            moduleLevels,
            assignedCongregation,
            userEmail,
            userName: memData.name || metaName || userEmail || "Usuário",
            roleLabel:
              memData.roleLabel ||
              (manager ? "Gestor do Contrato" : membership.access_level),
          });
        }
        return;
      }

      // Fallback para contas criadas exclusivamente pela hierarquia da EBD (user_roles)
      if (contractId && roleKind) {
        const [{ data: cRow }, userMinistryId, congRow] = await Promise.all([
          supabase.from("platform_contracts").select("ministry_id").eq("id", contractId).maybeSingle(),
          resolveRoleMinistryId({ ministryId, headquartersId, regionalId, congregationId }),
          congregationId
            ? supabase.from("congregations").select("name").eq("id", congregationId).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        if (cRow?.ministry_id && userMinistryId && cRow.ministry_id === userMinistryId) {
          if (active) {
            setAccess({
              loading: false,
              signedIn: true,
              allowed: true,
              manager: roleKind === "igreja_mae",
              allowedModules: ["igreja_ebd"],
              moduleLevels: null,
              assignedCongregation:
                typeof congRow?.data?.name === "string" ? congRow.data.name : null,
              userEmail,
              userName: metaName || userEmail || "Usuário EBD",
              roleLabel: roleKind,
            });
          }
          return;
        }
      }

      if (active) {
        setAccess({
          loading: false,
          signedIn: true,
          allowed: false,
          manager: false,
          allowedModules: null,
          moduleLevels: null,
          assignedCongregation: null,
          userEmail,
          userName: metaName || userEmail,
          roleLabel: null,
        });
      }
    };

    load();
    const { data: authSub } = supabase.auth.onAuthStateChange(() => {
      setTimeout(load, 0);
    });
    const channel = supabase
      .channel(`access-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_memberships" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_contracts" }, load)
      .subscribe();
    window.addEventListener(PLATFORM_ACCESS_EVENT, load);

    return () => {
      active = false;
      authSub.subscription.unsubscribe();
      supabase.removeChannel(channel);
      window.removeEventListener(PLATFORM_ACCESS_EVENT, load);
    };
  }, [contractId, roleLoading, roleKind, ministryId, headquartersId, regionalId, congregationId]);

  return access;
}
