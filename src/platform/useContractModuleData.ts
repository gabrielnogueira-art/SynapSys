import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/** Operational data is scoped and authorized by Supabase, never by browser storage. */
export function useContractModuleData<T>(contractId: string, moduleKey: string, empty: T) {
  const [value, setValue] = useState<T>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const valueRef = useRef(value);
  const revision = useRef<string | null>(null);
  const saving = useRef(false);
  const ready = useRef(false);
  const { toast } = useToast();
  const db = supabase;
  useEffect(() => {
    let active = true;
    ready.current = false;
    revision.current = null;
    setLoading(true);
    setError(null);
    setValue(empty);
    valueRef.current = empty;
    const load = async () => {
      const { data, error: failure } = await db.from("platform_module_data").select("data,updated_at").eq("contract_id", contractId).eq("module_key", moduleKey).maybeSingle();
      if (!active || saving.current) return;
      if (failure) { setError("Não foi possível carregar os dados deste contrato."); setLoading(false); return; }
      const next = data ? data.data as T : empty;
      revision.current = data?.updated_at ?? null;
      valueRef.current = next;
      setValue(next);
      ready.current = true;
      setLoading(false);
    };
    void load();
    const channel = db.channel(`module-${crypto.randomUUID()}`).on("postgres_changes", { event: "*", schema: "public", table: "platform_module_data", filter: `contract_id=eq.${contractId}` }, () => { void load(); }).subscribe();
    return () => { active = false; ready.current = false; void db.removeChannel(channel); };
  // The empty value is a stable constant defined by each module.
  }, [contractId, moduleKey]);

  const update: Dispatch<SetStateAction<T>> = (action) => {
    if (!ready.current || saving.current) {
      toast({ variant: "destructive", title: "Aguarde a conclusão do carregamento ou salvamento." });
      return;
    }
    const previous = valueRef.current;
    const next = typeof action === "function" ? (action as (previous: T) => T)(previous) : action;
    saving.current = true;
    void (async () => {
      try {
        const payload = { contract_id: contractId, module_key: moduleKey, data: next as never };
        const response = revision.current
          ? await db.from("platform_module_data").update({ data: payload.data }).eq("contract_id", contractId).eq("module_key", moduleKey).eq("updated_at", revision.current).select("updated_at").maybeSingle()
          : await db.from("platform_module_data").insert(payload).select("updated_at").single();
        if (response.error || !response.data) throw new Error("Não foi possível salvar. Reabra o módulo para carregar a versão atual e tente novamente.");
        revision.current = response.data.updated_at;
        valueRef.current = next;
        setValue(next);
        toast({ title: "Dados salvos" });
      } catch (failure) {
        toast({ variant: "destructive", title: "Alteração não salva", description: failure instanceof Error ? failure.message : "Tente novamente." });
      } finally { saving.current = false; }
    })();
  };
  return { value, update, loading, error };
}