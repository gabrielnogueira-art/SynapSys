import { useEffect, useState } from "react";
import { useBranding } from "@/hooks/useBranding";
import { useScope } from "@/context/ScopeContext";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformStore } from "@/platform/store";

export interface ReportIdentityData { name: string; logoUrl?: string | null; president?: string | null }
export function useReportIdentity(): ReportIdentityData {
  const { ministry } = useBranding();
  const { applied } = useScope();
  const { contracts } = usePlatformStore();
  const [identity, setIdentity] = useState<ReportIdentityData | null>(null);
  useEffect(() => {
    let active = true;
    setIdentity(null);
    const load = async () => {
      let ministryId = applied?.ministryId;
      let name: string | null = null;
      let hqId = applied?.headquartersId;
      if (applied?.congregationId) {
        const { data } = await supabase.from("congregations").select("name,headquarters_id").eq("id", applied.congregationId).maybeSingle();
        name = data?.name ?? null; hqId = data?.headquarters_id;
      }
      if (hqId) {
        const { data } = await supabase.from("headquarters").select("name,ministry_id").eq("id", hqId).maybeSingle();
        if (!name) name = data?.name ?? null;
        ministryId = data?.ministry_id;
      }
      if (!ministryId) return;
      const { data } = await supabase.from("ministries").select("name,display_name,logo_url,president_pastor").eq("id", ministryId).maybeSingle();
      const c = contracts.find((x) => x.supabaseMinistryId === ministryId);
      if (active && data) setIdentity({ name: name || c?.clientName || data.display_name || data.name, logoUrl: c?.branding?.logoUrl ?? data.logo_url, president: c?.branding?.presidentPastor ?? data.president_pastor });
    };
    load();
    return () => { active = false; };
  }, [applied, contracts]);
  return identity ?? { name: ministry?.display_name || ministry?.name || "Escola Bíblica Dominical", logoUrl: ministry?.logo_url, president: ministry?.president_pastor };
}
export const ReportIdentity = ({ identity }: { identity: ReportIdentityData }) => <div className="flex items-center gap-3 min-w-0">
  {identity.logoUrl && <img src={identity.logoUrl} alt={identity.name} className="w-14 h-14 object-contain shrink-0" />}
  <div className="min-w-0"><h1 className="text-sm font-bold">{identity.name}</h1><h2 className="text-xs">Secretaria da Escola Bíblica Dominical — EBD</h2>{identity.president && <p className="text-xs">Pastor presidente: {identity.president}</p>}</div>
</div>;
