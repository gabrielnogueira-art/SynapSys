import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformContract, ModuleId, ContractStatus } from "@/platform/types";
import { getModulesBySegment } from "@/platform/catalog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { contractPublicUrl, normalizeContractSlug, usePlatformOrigin, validateContractSlug } from "@/platform/contractLinks";

interface Props {
  contract: PlatformContract | null;
  onClose: () => void;
  onSave: (id: string, patch: Partial<PlatformContract>) => Promise<void>;
  brandingOnly?: boolean;
}
export const ContractModulesDialog = ({ contract, onClose, onSave, brandingOnly = false }: Props) => {
  const { toast } = useToast();
  const { origin: platformOrigin } = usePlatformOrigin();
  const [draft, setDraft] = useState<Partial<PlatformContract>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (contract) setDraft({ ...contract }); }, [contract]);
  if (!contract) return null;
  const field = (key: keyof PlatformContract, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));
  const brand = (key: "logoUrl" | "primaryHsl" | "presidentPastor", value: string) => setDraft((d) => ({ ...d, branding: { ...d.branding, [key]: value || null } }));
  const save = async () => {
    setSaving(true);
    try {
      if (!brandingOnly && draft.slug?.trim()) validateContractSlug(draft.slug);
      await onSave(contract.id, brandingOnly ? { branding: draft.branding } : draft);
      toast({ title: "Alterações salvas no Supabase" });
      onClose();
    } catch (e: any) { toast({ variant: "destructive", title: "Não foi possível salvar", description: e.message }); }
    finally { setSaving(false); }
  };
  return <Dialog open onOpenChange={(v) => { if (!v && !saving) onClose(); }}>
    <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Configurar {contract.code}</DialogTitle></DialogHeader>
      <div className="space-y-4">
        {!brandingOnly && <>
          <Label htmlFor="contract-client">Nome do cliente</Label><Input id="contract-client" value={draft.clientName ?? ""} onChange={(e) => field("clientName", e.target.value)} />
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="contract-slug">Link amigável do cliente</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs"
                onClick={() => field("slug", normalizeContractSlug(draft.clientName || contract.clientName))}
              >
                Sugerir pelo nome
              </Button>
            </div>
            <Input id="contract-slug" placeholder={contract.id} value={draft.slug ?? ""} maxLength={80} onChange={(e) => field("slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))} />
            <p className="text-xs text-muted-foreground break-all">{contractPublicUrl({ id: contract.id, slug: draft.slug?.trim() || undefined }, false, platformOrigin)}</p>
          </div>
          <div className="flex items-center justify-between gap-3"><Label htmlFor="contract-login-first">Exigir login na entrada</Label><Switch id="contract-login-first" checked={draft.requireLoginOnEntry ?? false} onCheckedChange={(value) => field("requireLoginOnEntry", value)} /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><Label htmlFor="contract-city">Cidade / UF</Label><Input id="contract-city" value={draft.city ?? ""} onChange={(e) => field("city", e.target.value)} /></div>
            <div><Label htmlFor="contract-responsible">Responsável</Label><Input id="contract-responsible" value={draft.responsibleName ?? ""} onChange={(e) => field("responsibleName", e.target.value)} /></div>
            <div><Label htmlFor="contract-email">E-mail de contato</Label><Input id="contract-email" type="email" value={draft.responsibleEmail ?? ""} onChange={(e) => field("responsibleEmail", e.target.value)} /></div>
            <div><Label htmlFor="contract-plan">Plano</Label><Input id="contract-plan" value={draft.planName ?? ""} onChange={(e) => field("planName", e.target.value)} /></div>
            <div><Label htmlFor="contract-price">Valor mensal (R$)</Label><Input id="contract-price" type="number" min="0" step="0.01" value={draft.monthlyValue ?? ""} onChange={(e) => field("monthlyValue", e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div><Label>Status</Label><Select value={draft.status} onValueChange={(v) => field("status", v as ContractStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["ativo", "implantacao", "demonstracao", "suspenso"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <Label>Módulos ativos</Label>
          <div className="space-y-2">{getModulesBySegment(contract.segment).map((m) => <label key={m.id} className="flex gap-2 items-center text-sm"><Checkbox checked={draft.activeModules?.includes(m.id)} onCheckedChange={(checked) => field("activeModules", checked ? [...(draft.activeModules ?? []), m.id] : (draft.activeModules ?? []).filter((x: ModuleId) => x !== m.id))} />{m.name}</label>)}</div>
          <Label htmlFor="contract-notes">Notas</Label><Textarea id="contract-notes" value={draft.notes ?? ""} onChange={(e) => field("notes", e.target.value)} />
        </>}
        <div className="border-t pt-4 space-y-3">
          <div><Label htmlFor="contract-logo">Logo (endereço HTTPS)</Label><Input id="contract-logo" type="url" value={draft.branding?.logoUrl ?? ""} onChange={(e) => brand("logoUrl", e.target.value)} /></div>
          <div><Label htmlFor="contract-pastor">Pastor presidente / líder</Label><Input id="contract-pastor" value={draft.branding?.presidentPastor ?? ""} onChange={(e) => brand("presidentPastor", e.target.value)} /></div>
          <div><Label htmlFor="contract-color">Cor principal (H S% L%)</Label><Input id="contract-color" placeholder="150 60% 35%" value={draft.branding?.primaryHsl ?? ""} onChange={(e) => brand("primaryHsl", e.target.value)} /></div>
          {draft.branding?.logoUrl && <img src={draft.branding.logoUrl} alt="Logo do contrato" className="h-16 max-w-full object-contain" />}
        </div>
      </div>
      <DialogFooter><Button variant="outline" disabled={saving} onClick={onClose}>Cancelar</Button><Button disabled={saving || (!brandingOnly && (!draft.clientName?.trim() || !draft.activeModules?.length))} onClick={save}>{saving ? "Salvando…" : "Salvar Alterações"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
};
