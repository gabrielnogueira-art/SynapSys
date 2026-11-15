import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";

export function useContractAccess(contractId?: string) {
  const role = useUserRole();
  const [access, setAccess] = useState({ loading: true, signedIn: false, allowed: false, manager: false });
  useEffect(() => {
    if (role.loading) return;
    let active = true;
    setAccess((s) => ({ ...s, loading: true }));
    const load = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        if (active) setAccess({ loading: false, signedIn: false, allowed: false, manager: false });
        return;
      }
      if (role.role === "master") {
        if (active) setAccess({ loading: false, signedIn: true, allowed: true, manager: true });
        return;
      }
      const { data: rows, error } = await supabase.from("platform_memberships")
        .select("contract_id,access_level,status").eq("user_id", data.session.user.id).eq("status", "ativo");
      const membership = rows?.find((r) => !contractId || r.contract_id === contractId);
      if (active) setAccess({ loading: false, signedIn: true, allowed: !error && !!membership, manager: membership?.access_level === "gestor_contrato" });
    };
    load();
    const channel = supabase.channel(`access-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_memberships" }, load).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [contractId, role.loading, role.role]);
  return access;
}