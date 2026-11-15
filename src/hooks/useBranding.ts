import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "./useUserRole";
import { usePlatformStore } from "@/platform/store";

export interface MinistryBranding {
  id: string;
  name: string;
  display_name: string | null;
  city: string | null;
  state: string | null;
  president_pastor: string | null;
  logo_url: string | null;
  brand_primary_hsl: string | null;
}
const db = supabase as any;
async function resolveMinistryId(role: ReturnType<typeof useUserRole>): Promise<string | null> {
  if (role.ministryId) return role.ministryId;
  let hqId = role.headquartersId;
  if (!hqId && role.regionalId) {
    const { data } = await db.from("regionals").select("headquarters_id").eq("id", role.regionalId).maybeSingle();
    hqId = data?.headquarters_id;
  }
  if (!hqId && role.congregationId) {
    const { data } = await db.from("congregations").select("headquarters_id").eq("id", role.congregationId).maybeSingle();
    hqId = data?.headquarters_id;
  }
  if (!hqId) return null;
  const { data } = await db.from("headquarters").select("ministry_id").eq("id", hqId).maybeSingle();
  return data?.ministry_id ?? null;
}
export function useBranding() {
  const role = useUserRole();
  const { pathname } = useLocation();
  const store = usePlatformStore();
  const id = pathname.match(/^\/c\/([^/]+)/)?.[1];
  const contract = store.contracts.find((c) => c.id === id);
  const [ministry, setMinistry] = useState<MinistryBranding | null>(null);
  const [loading, setLoading] = useState(true);
  const [key, setKey] = useState(0);
  useEffect(() => {
    if (role.loading) return;
    let active = true;
    const load = async () => {
      setLoading(true);
      const mid = role.role === "master" ? null : await resolveMinistryId(role);
      if (!mid) { if (active) { setMinistry(null); setLoading(false); } return; }
      const { data, error } = await db.from("ministries").select("*").eq("id", mid).maybeSingle();
      if (error) console.error("[Identidade visual]", error);
      if (active) { setMinistry(data ?? null); setLoading(false); }
    };
    load();
    const channel = supabase.channel(`branding-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ministries" }, load).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [role.loading, role.role, role.ministryId, role.headquartersId, role.regionalId, role.congregationId, key]);
  const resolved: MinistryBranding | null = contract ? {
    id: contract.supabaseMinistryId || contract.id, name: contract.clientName, display_name: contract.clientName,
    city: contract.city ?? null, state: null,
    logo_url: contract.branding?.logoUrl ?? ministry?.logo_url ?? null,
    president_pastor: contract.branding?.presidentPastor ?? ministry?.president_pastor ?? null,
    brand_primary_hsl: contract.branding?.primaryHsl ?? ministry?.brand_primary_hsl ?? null,
  } : ministry;
  return { ministry: resolved, loading: id ? store.loading : loading, refresh: () => { setKey((v) => v + 1); store.reload(); } };
}
