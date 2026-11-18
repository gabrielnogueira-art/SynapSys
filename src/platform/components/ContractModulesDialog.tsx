import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlatformContract, ModuleId, ContractStatus, ContractLegalStatus, PricingTier, LabModuleId } from "@/platform/types";
import type { LabPromotionsMap } from "@/platform/labs/labsTypes";
import { Badge } from "@/components/ui/badge";
import { getModulesBySegment } from "@/platform/catalog";
import {
  calculateTieredPrice,
  CONTRACT_LEGAL_STATUS_META,
  DEFAULT_PRICING_TIERS,
  formatBRL,
} from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { contractPublicUrl, normalizeContractSlug, usePlatformOrigin, validateContractSlug } from "@/platform/contractLinks";

interface Props {
  contract: PlatformContract | null;
  pricingTiers?: PricingTier[];
  labPromotions?: LabPromotionsMap;
  onClose: () => void;
  onSave: (id: string, patch: Partial<PlatformContract>) => Promise<void>;
  brandingOnly?: boolean;
}
export const ContractModulesDialog = ({ contract, pricingTiers = DEFAULT_PRICING_TIERS, labPromotions, onClose, onSave, brandingOnly = false }: Props) => {
  const { toast } = useToast();
  const { origin: platformOrigin } = usePlatformOrigin();
  const [draft, setDraft] = useState<Partial<PlatformContract>>({});
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (contract) setDraft({ ...contract }); }, [contract]);
  if (!contract) return null;
  const field = (key: keyof PlatformContract, value: unknown) => setDraft((d) => ({ ...d, [key]: value }));
  const brand = (key: "logoUrl" | "primaryHsl" | "presidentPastor", value: string) => setDraft((d) => ({ ...d, branding: { ...d.branding, [key]: value || null } }));
  const units = Math.max(1, Math.floor(Number(draft.unitsCount ?? contract.unitsCount ?? 1) || 1));
  const tierCalc = calculateTieredPrice(contract.segment, units, pricingTiers);
  const save = async () => {
    setSaving(true);
    try {
      if (!brandingOnly && draft.slug?.trim()) validateContractSlug(draft.slug);
      await onSave(contract.id, brandingOnly ? { branding: draft.branding } : draft);
      toast({ title: "Alterações salvas no Supabase" });
      onClose();
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro ao salvar alterações",
      });
    }
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
            <div><Label htmlFor="contract-legal-name">Razão social (p/ Minuta)</Label><Input id="contract-legal-name" placeholder={draft.clientName ?? ""} value={draft.legalName ?? ""} onChange={(e) => field("legalName", e.target.value)} /></div>
            <div><Label htmlFor="contract-doc">CNPJ / CPF</Label><Input id="contract-doc" placeholder="00.000.000/0001-00" value={draft.documentNumber ?? ""} onChange={(e) => field("documentNumber", e.target.value)} /></div>
            <div className="sm:col-span-2"><Label htmlFor="contract-address">Endereço completo</Label><Input id="contract-address" placeholder="Rua, nº, bairro, CEP" value={draft.address ?? ""} onChange={(e) => field("address", e.target.value)} /></div>
            <div><Label htmlFor="contract-city">Cidade / UF</Label><Input id="contract-city" value={draft.city ?? ""} onChange={(e) => field("city", e.target.value)} /></div>
            <div><Label htmlFor="contract-responsible">Responsável</Label><Input id="contract-responsible" value={draft.responsibleName ?? ""} onChange={(e) => field("responsibleName", e.target.value)} /></div>
            <div><Label htmlFor="contract-email">E-mail de contato</Label><Input id="contract-email" type="email" value={draft.responsibleEmail ?? ""} onChange={(e) => field("responsibleEmail", e.target.value)} /></div>
            <div><Label htmlFor="contract-units">{contract.segment === "igreja" ? "Qtde de igrejas / unidades" : "Qtde de unidades / lojas"}</Label><Input id="contract-units" type="number" min="1" step="1" value={draft.unitsCount ?? 1} onChange={(e) => field("unitsCount", Math.max(1, Math.floor(Number(e.target.value) || 1)))} /></div>
            <div><Label htmlFor="contract-plan">Plano</Label><Input id="contract-plan" value={draft.planName ?? ""} onChange={(e) => field("planName", e.target.value)} /></div>
            <div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="contract-price">Valor mensal (R$)</Label>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-5 px-1.5 text-[11px] text-primary"
                  onClick={() => {
                    field("monthlyValue", tierCalc.totalMonthly);
                    field("planName", `${tierCalc.tier.name} (${tierCalc.ruleLabel})`);
                  }}
                >
                  Tabela ({formatBRL(tierCalc.totalMonthly)})
                </Button>
              </div>
              <Input id="contract-price" type="number" min="0" step="0.01" value={draft.monthlyValue ?? ""} onChange={(e) => field("monthlyValue", e.target.value ? Number(e.target.value) : undefined)} />
            </div>
            <div><Label htmlFor="contract-due-day">Dia de vencimento</Label><Input id="contract-due-day" type="number" min="1" max="28" value={draft.billingDueDay ?? 10} onChange={(e) => field("billingDueDay", Math.max(1, Math.min(28, Math.floor(Number(e.target.value) || 10))))} /></div>
            <div><Label htmlFor="contract-start">Início do contrato</Label><Input id="contract-start" type="date" value={draft.contractStartDate ?? ""} onChange={(e) => field("contractStartDate", e.target.value)} /></div>
            <div><Label>Status operacional</Label><Select value={draft.status} onValueChange={(v) => field("status", v as ContractStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["ativo", "implantacao", "demonstracao", "suspenso"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Status contratual (Minuta)</Label><Select value={draft.contractLegalStatus ?? "em_elaboracao"} onValueChange={(v) => field("contractLegalStatus", v as ContractLegalStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CONTRACT_LEGAL_STATUS_META).map(([k, meta]) => <SelectItem key={k} value={k}>{meta.label}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <p className="text-[11px] text-muted-foreground rounded border bg-muted/40 px-2.5 py-1.5">
            Cálculo sugerido pela tabela ({tierCalc.tier.name}): <strong>{tierCalc.ruleLabel} = {formatBRL(tierCalc.totalMonthly)}/mês</strong>
          </p>
          <Label>Módulos ativos</Label>
          <div className="space-y-2">
            {getModulesBySegment(contract.segment, labPromotions).map((m) => {
              const promo = m.isLabModule ? labPromotions?.[m.id as LabModuleId] : undefined;
              return (
                <label key={m.id} className="flex gap-2 items-center text-sm flex-wrap">
                  <Checkbox
                    checked={draft.activeModules?.includes(m.id)}
                    onCheckedChange={(checked) =>
                      field(
                        "activeModules",
                        checked
                          ? [...(draft.activeModules ?? []), m.id]
                          : (draft.activeModules ?? []).filter((x: ModuleId) => x !== m.id)
                      )
                    }
                  />
                  <span>{m.name}</span>
                  {promo && (
                    <Badge variant="outline" className="text-[10px]">
                      {promo.commercialModel === "pacote_padrao"
                        ? "Pacote Padrão (Labs)"
                        : `Add-on +${formatBRL(promo.addonMonthlyPrice)}/mês`}
                    </Badge>
                  )}
                </label>
              );
            })}
          </div>
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
