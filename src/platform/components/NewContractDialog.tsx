import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  contractPublicUrl,
  normalizeContractSlug,
  usePlatformOrigin,
  validateContractSlug,
} from "@/platform/contractLinks";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Church, Store } from "lucide-react";
import {
  ContractStatus,
  ModuleId,
  PlatformContract,
  PricingTier,
  ProjectSegment,
} from "@/platform/types";
import {
  getModulesBySegment,
  SEGMENT_DEFINITIONS,
  slugifyContractFolder,
} from "@/platform/catalog";
import {
  calculateTieredPrice,
  DEFAULT_PRICING_TIERS,
  formatBRL,
} from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";
import { NewContractInput } from "@/platform/store";
import type { LabPromotionsMap } from "@/platform/labs/labsTypes";

interface NewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextCodePreview: string;
  pricingTiers?: PricingTier[];
  labPromotions?: LabPromotionsMap;
  onCreate: (input: NewContractInput) => Promise<PlatformContract>;
}

export const NewContractDialog = ({
  open,
  onOpenChange,
  nextCodePreview,
  pricingTiers = DEFAULT_PRICING_TIERS,
  labPromotions,
  onCreate,
}: NewContractDialogProps) => {
  const { toast } = useToast();
  const { origin: platformOrigin } = usePlatformOrigin();
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [documentNumber, setDocumentNumber] = useState("");
  const [address, setAddress] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [requireLoginOnEntry, setRequireLoginOnEntry] = useState(true);
  const [segment, setSegment] = useState<ProjectSegment>("igreja");
  const [status, setStatus] = useState<ContractStatus>("ativo");
  const [city, setCity] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [unitsCount, setUnitsCount] = useState("1");
  const [billingDueDay, setBillingDueDay] = useState("10");
  const [monthlyValue, setMonthlyValue] = useState(() =>
    String(calculateTieredPrice("igreja", 1, pricingTiers).totalMonthly.toFixed(2))
  );
  const [monthlyEdited, setMonthlyEdited] = useState(false);
  const [notes, setNotes] = useState("");
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>(["igreja_ebd"]);

  const parsedUnits = Math.max(1, Math.floor(Number(unitsCount) || 1));
  const tierCalc = calculateTieredPrice(segment, parsedUnits, pricingTiers);
  const segmentModules = getModulesBySegment(segment, labPromotions);
  const folderSlug = slugifyContractFolder(nextCodePreview, clientName || "cliente");

  const handleSegmentChange = (nextSeg: ProjectSegment) => {
    setSegment(nextSeg);
    const defaultMod = getModulesBySegment(nextSeg, labPromotions)[0]?.id;
    setSelectedModules(defaultMod ? [defaultMod] : []);
    if (!monthlyEdited) {
      setMonthlyValue(
        calculateTieredPrice(nextSeg, parsedUnits, pricingTiers).totalMonthly.toFixed(2)
      );
    }
  };

  const handleUnitsChange = (nextRaw: string) => {
    setUnitsCount(nextRaw);
    const nextUnits = Math.max(1, Math.floor(Number(nextRaw) || 1));
    if (!monthlyEdited) {
      setMonthlyValue(
        calculateTieredPrice(segment, nextUnits, pricingTiers).totalMonthly.toFixed(2)
      );
    }
  };

  const toggleModule = (modId: ModuleId) => {
    setSelectedModules((prev) =>
      prev.includes(modId)
        ? prev.length > 1
          ? prev.filter((m) => m !== modId)
          : prev
        : [...prev, modId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || selectedModules.length === 0) return;

    setSaving(true);
    try {
      const validSlug = validateContractSlug(slug);
      await onCreate({
        slug: validSlug,
        requireLoginOnEntry,
        clientName,
        legalName: legalName.trim() || undefined,
        documentNumber: documentNumber.trim() || undefined,
        address: address.trim() || undefined,
        unitsCount: parsedUnits,
        billingDueDay: Math.max(1, Math.min(28, Math.floor(Number(billingDueDay) || 10))),
        segment,
        status,
        activeModules: selectedModules,
        city,
        responsibleName,
        responsibleEmail,
        monthlyValue: monthlyValue ? parseFloat(monthlyValue) : tierCalc.totalMonthly,
        planName: `${tierCalc.tier.name} (${parsedUnits} ${
          segment === "igreja" ? "igreja(s)" : "unid."
        } • ${selectedModules.length} módulo${selectedModules.length > 1 ? "s" : ""})`,
        notes,
      });

      setClientName("");
      setLegalName("");
      setDocumentNumber("");
      setAddress("");
      setSlug("");
      setSlugEdited(false);
      setRequireLoginOnEntry(true);
      setCity("");
      setResponsibleName("");
      setResponsibleEmail("");
      setUnitsCount("1");
      setBillingDueDay("10");
      setMonthlyEdited(false);
      setMonthlyValue(
        calculateTieredPrice(segment, 1, pricingTiers).totalMonthly.toFixed(2)
      );
      setNotes("");
      onOpenChange(false);
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Não foi possível criar contrato",
        description: e instanceof Error ? e.message : "Erro ao criar contrato",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Contrato na Plataforma ({nextCodePreview})</DialogTitle>
          <DialogDescription>
            Escolha o segmento do projeto e quais módulos farão parte deste contrato.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button variant="outline"
              type="button"
              onClick={() => handleSegmentChange("igreja")}
              className={`h-auto block whitespace-normal p-3 rounded-lg border text-left transition-all ${
                segment === "igreja"
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Church className="h-4 w-4 text-primary" /> Projeto: Igreja & Ministério
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                EBD, Tesouraria Eclesiástica e Secretaria da Igreja.
              </p>
            </Button>

            <Button variant="outline"
              type="button"
              onClick={() => handleSegmentChange("comercio")}
              className={`h-auto block whitespace-normal p-3 rounded-lg border text-left transition-all ${
                segment === "comercio"
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Store className="h-4 w-4 text-primary" /> Projeto: Comércio & Empresas
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Tesouraria Comercial, Secretaria, Estoque, RH e PDV.
              </p>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label>Nome do Cliente / Instituição *</Label>
              <Input
                placeholder={
                  segment === "igreja"
                    ? "Ex: Assembleia de Deus — Campo Central"
                    : "Ex: Mercado & Distribuidora Silva"
                }
                value={clientName}
                onChange={(e) => { setClientName(e.target.value); if (!slugEdited) setSlug(normalizeContractSlug(e.target.value)); }}
                required
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <Label htmlFor="new-contract-slug">Link amigável do cliente *</Label>
              <Input id="new-contract-slug" placeholder="adcampos" value={slug} maxLength={80} required onChange={(e) => { setSlugEdited(true); setSlug(e.target.value.toLowerCase()); }} />
              <p className="text-xs text-muted-foreground break-all">{contractPublicUrl({ id: folderSlug, slug }, false, platformOrigin)}</p>
            </div>
            <div className="flex items-center justify-between gap-3 sm:col-span-2">
              <Label htmlFor="new-contract-login">Exigir login na entrada</Label>
              <Switch id="new-contract-login" checked={requireLoginOnEntry} onCheckedChange={setRequireLoginOnEntry} />
            </div>

            <div className="space-y-1">
              <Label>Status do Contrato</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ContractStatus)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo (Em operação)</SelectItem>
                  <SelectItem value="implantacao">Em implantação</SelectItem>
                  <SelectItem value="demonstracao">Demonstração / Proposta</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Cidade / UF</Label>
              <Input
                placeholder="Ex: Campinas - SP"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>CNPJ / CPF (p/ Minuta)</Label>
              <Input
                placeholder="00.000.000/0001-00"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Razão Social (se diferente)</Label>
              <Input
                placeholder="Nome jurídico completo"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Endereço completo (p/ Minuta)</Label>
              <Input
                placeholder="Rua, nº, bairro, CEP"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Responsável pelo Contrato</Label>
              <Input
                placeholder="Nome do pastor ou gerente"
                value={responsibleName}
                onChange={(e) => setResponsibleName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>E-mail de contato do gestor</Label>
              <Input
                type="email"
                placeholder="gestor@cliente.com"
                value={responsibleEmail}
                onChange={(e) => setResponsibleEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>{segment === "igreja" ? "Qtde de Igrejas / Unidades" : "Qtde de Unidades / Lojas"}</Label>
              <Input
                type="number"
                min="1"
                step="1"
                value={unitsCount}
                onChange={(e) => handleUnitsChange(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Dia de vencimento mensal</Label>
              <Input
                type="number"
                min="1"
                max="28"
                step="1"
                value={billingDueDay}
                onChange={(e) => setBillingDueDay(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label>Valor Mensal (R$)</Label>
                {monthlyEdited && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-xs text-primary"
                    onClick={() => {
                      setMonthlyEdited(false);
                      setMonthlyValue(tierCalc.totalMonthly.toFixed(2));
                    }}
                  >
                    Aplicar tabela ({formatBRL(tierCalc.totalMonthly)})
                  </Button>
                )}
              </div>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="99.90"
                value={monthlyValue}
                onChange={(e) => {
                  setMonthlyEdited(true);
                  setMonthlyValue(e.target.value);
                }}
              />
            </div>

            <div className="space-y-1">
              <Label>Pasta Isolada p/ Customizações</Label>
              <div className="h-10 px-3 rounded-md border bg-muted/40 flex items-center text-xs font-mono text-muted-foreground truncate">
                GitHub/src/contracts/{folderSlug}
              </div>
            </div>

            <div className="sm:col-span-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2">
              <span>
                <strong>{tierCalc.tier.name}:</strong> {tierCalc.ruleLabel} ={" "}
                <strong className="text-primary">{formatBRL(tierCalc.totalMonthly)}/mês</strong>
              </span>
              {tierCalc.savingsPerUnit > 0 && (
                <Badge variant="outline" className="text-[11px] border-primary/40 text-primary">
                  Desconto de {formatBRL(tierCalc.savingsPerUnit)}/unid.
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Módulos Contratados ({SEGMENT_DEFINITIONS[segment].name})</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {segmentModules.map((mod) => {
                const checked = selectedModules.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer text-sm ${
                      checked ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleModule(mod.id)}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-medium flex items-center gap-1.5 flex-wrap">
                        <span>{mod.shortName}</span>
                        <Badge
                          variant={mod.maturity === "producao" ? "default" : "secondary"}
                          className="text-[10px] h-4 px-1.5"
                        >
                          {mod.maturity === "producao" ? "Produção" : "Preview"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {mod.description}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Observações do Contrato</Label>
            <Textarea
              rows={2}
              placeholder="Particularidades combinadas com o cliente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>{saving ? "Salvando…" : "Criar Contrato"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
