import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import type { ModuleId } from "./types";

const db = supabase as any;
export const PLATFORM_ACCESS_EVENT = "platform-access-updated";

export interface ContractAccessState {
  loading: boolean;
  signedIn: boolean;
  allowed: boolean;
  manager: boolean;
  allowedModules: ModuleId[] | null;
  moduleLevels: Partial<Record<ModuleId, string>> | null;
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
  userEmail: null,
  userName: null,
  roleLabel: null,
};

async function resolveRoleMinistryId(role: ReturnType<typeof useUserRole>): Promise<string | null> {
  if (role.ministryId) return role.ministryId;
  let hqId = role.headquartersId;
  if (!hqId && role.regionalId) {
    const { data } = await db.from("regionals").select("headquarters_id").eq("id", role.regionalId).maybeSingle();
    hqId = data?.headquarters_id ?? null;
  }
  if (!hqId && role.congregationId) {
    const { data } = await db.from("congregations").select("headquarters_id").eq("id", role.congregationId).maybeSingle();
    hqId = data?.headquarters_id ?? null;
  }
  if (!hqId) return null;
  const { data } = await db.from("headquarters").select("ministry_id").eq("id", hqId).maybeSingle();
  return data?.ministry_id ?? null;
}

export function useContractAccess(contractId?: string): ContractAccessState {
  const role = useUserRole();
  const [access, setAccess] = useState<ContractAccessState>(EMPTY_ACCESS);

  useEffect(() => {
    if (role.loading) return;
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

      if (role.role === "master") {
        if (active) {
          setAccess({
            loading: false,
            signedIn: true,
            allowed: true,
            manager: true,
            allowedModules: null,
            moduleLevels: null,
            userEmail,
            userName: metaName || userEmail || "Master",
            roleLabel: "Master / Dono da Plataforma",
          });
        }
        return;
      }

      const { data: rows, error } = await db
        .from("platform_memberships")
        .select("id,contract_id,access_level,status,data")
        .eq("user_id", uid)
        .eq("status", "ativo");

      const membership = (rows as any[] | null)?.find(
        (r) => !contractId || r.contract_id === contractId
      );

      if (!error && membership) {
        let allowedModules: ModuleId[] | null =
          Array.isArray(membership.data?.allowedModules) && membership.data.allowedModules.length > 0
            ? (membership.data.allowedModules as ModuleId[])
            : null;
        let moduleLevels: Partial<Record<ModuleId, string>> | null =
          membership.data?.moduleLevels && typeof membership.data.moduleLevels === "object"
            ? (membership.data.moduleLevels as Partial<Record<ModuleId, string>>)
            : null;

        if (!allowedModules || !moduleLevels) {
          const { data: contractRow } = await db
            .from("platform_contracts")
            .select("data")
            .eq("id", membership.contract_id)
            .maybeSingle();
          if (!allowedModules) {
            const overrides = contractRow?.data?.memberModuleOverrides as Record<string, ModuleId[]> | undefined;
            const byId = overrides?.[membership.id];
            const byEmail = userEmail ? overrides?.[userEmail.toLowerCase()] : undefined;
            const resolved = byId?.length ? byId : byEmail?.length ? byEmail : null;
            if (resolved) allowedModules = resolved;
          }
          if (!moduleLevels) {
            const levelOverrides = contractRow?.data?.memberModuleLevelOverrides as
              | Record<string, Partial<Record<ModuleId, string>>>
              | undefined;
            const resolvedLevels =
              levelOverrides?.[membership.id] ??
              (userEmail ? levelOverrides?.[userEmail.toLowerCase()] : undefined) ??
              null;
            if (resolvedLevels) moduleLevels = resolvedLevels;
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
            userEmail,
            userName: membership.data?.name || metaName || userEmail || "Usuário",
            roleLabel:
              membership.data?.roleLabel ||
              (manager ? "Gestor do Contrato" : membership.access_level),
          });
        }
        return;
      }

      // Fallback para contas criadas exclusivamente pela hierarquia da EBD (user_roles)
      if (contractId && role.role) {
        const [{ data: cRow }, userMinistryId] = await Promise.all([
          db.from("platform_contracts").select("ministry_id").eq("id", contractId).maybeSingle(),
          resolveRoleMinistryId(role),
        ]);
        if (cRow?.ministry_id && userMinistryId && cRow.ministry_id === userMinistryId) {
          if (active) {
            setAccess({
              loading: false,
              signedIn: true,
              allowed: true,
              manager: role.role === "igreja_mae",
              allowedModules: ["igreja_ebd"],
              moduleLevels: null,
              userEmail,
              userName: metaName || userEmail || "Usuário EBD",
              roleLabel: role.role,
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
  }, [contractId, role.loading, role.role, role.ministryId, role.headquartersId, role.regionalId, role.congregationId]);

  return access;
}
