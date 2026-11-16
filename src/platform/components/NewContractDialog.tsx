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
  ProjectSegment,
} from "@/platform/types";
import {
  getModulesBySegment,
  SEGMENT_DEFINITIONS,
  slugifyContractFolder,
} from "@/platform/catalog";
import { useToast } from "@/hooks/use-toast";
import { NewContractInput } from "@/platform/store";

interface NewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nextCodePreview: string;
  onCreate: (input: NewContractInput) => Promise<PlatformContract>;
}

export const NewContractDialog = ({
  open,
  onOpenChange,
  nextCodePreview,
  onCreate,
}: NewContractDialogProps) => {
  const { toast } = useToast();
  const { origin: platformOrigin } = usePlatformOrigin();
  const [saving, setSaving] = useState(false);
  const [clientName, setClientName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [requireLoginOnEntry, setRequireLoginOnEntry] = useState(false);
  const [segment, setSegment] = useState<ProjectSegment>("igreja");
  const [status, setStatus] = useState<ContractStatus>("ativo");
  const [city, setCity] = useState("");
  const [responsibleName, setResponsibleName] = useState("");
  const [responsibleEmail, setResponsibleEmail] = useState("");
  const [monthlyValue, setMonthlyValue] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>(["igreja_ebd"]);

  const segmentModules = getModulesBySegment(segment);
  const folderSlug = slugifyContractFolder(nextCodePreview, clientName || "cliente");

  const handleSegmentChange = (nextSeg: ProjectSegment) => {
    setSegment(nextSeg);
    const defaultMod = getModulesBySegment(nextSeg)[0]?.id;
    setSelectedModules(defaultMod ? [defaultMod] : []);
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
      segment,
      status,
      activeModules: selectedModules,
      city,
      responsibleName,
      responsibleEmail,
      monthlyValue: monthlyValue ? parseFloat(monthlyValue) : undefined,
      planName: `${SEGMENT_DEFINITIONS[segment].name} (${selectedModules.length} módulo${
        selectedModules.length > 1 ? "s" : ""
      })`,
      notes,
    });

    setClientName("");
    setSlug("");
    setSlugEdited(false);
    setRequireLoginOnEntry(false);
    setCity("");
    setResponsibleName("");
    setResponsibleEmail("");
    setMonthlyValue("");
    setNotes("");
    onOpenChange(false);
    } catch (e: any) { toast({ variant: "destructive", title: "Não foi possível criar contrato", description: e.message }); }
    finally { setSaving(false); }
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
              <Label>Valor Mensal (R$ - opcional)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="299.00"
                value={monthlyValue}
                onChange={(e) => setMonthlyValue(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label>Pasta Isolada p/ Customizações</Label>
              <div className="h-10 px-3 rounded-md border bg-muted/40 flex items-center text-xs font-mono text-muted-foreground truncate">
                GitHub/src/contracts/{folderSlug}
              </div>
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
