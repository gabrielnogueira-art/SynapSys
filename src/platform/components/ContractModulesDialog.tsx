import { useEffect, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ContractStatus,
  ModuleId,
  PlatformContract,
} from "@/platform/types";
import { getModulesBySegment, SEGMENT_DEFINITIONS } from "@/platform/catalog";

interface ContractModulesDialogProps {
  contract: PlatformContract | null;
  onClose: () => void;
  onSave: (contractId: string, patch: Partial<PlatformContract>) => void;
}

export const ContractModulesDialog = ({
  contract,
  onClose,
  onSave,
}: ContractModulesDialogProps) => {
  const [clientName, setClientName] = useState("");
  const [status, setStatus] = useState<ContractStatus>("ativo");
  const [activeModules, setActiveModules] = useState<ModuleId[]>([]);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (!contract) return;
    setClientName(contract.clientName);
    setStatus(contract.status);
    setActiveModules(contract.activeModules);
    setNotes(contract.notes ?? "");
  }, [contract]);

  if (!contract) return null;

  const availableModules = getModulesBySegment(contract.segment);

  const toggleModule = (modId: ModuleId) => {
    setActiveModules((prev) =>
      prev.includes(modId)
        ? prev.length > 1
          ? prev.filter((m) => m !== modId)
          : prev
        : [...prev, modId]
    );
  };

  const handleSave = () => {
    onSave(contract.id, {
      clientName: clientName.trim() || contract.clientName,
      status,
      activeModules,
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  return (
    <Dialog open={!!contract} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Configurar Contrato {contract.code}
          </DialogTitle>
          <DialogDescription>
            Segmento: {SEGMENT_DEFINITIONS[contract.segment].name} • Pasta:{" "}
            <span className="font-mono text-xs">GitHub/{contract.codeFolder}/</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome do Cliente</Label>
            <Input value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as ContractStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="implantacao">Em implantação</SelectItem>
                <SelectItem value="demonstracao">Demonstração</SelectItem>
                <SelectItem value="suspenso">Suspenso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Módulos Ativos neste Contrato</Label>
            <div className="space-y-2">
              {availableModules.map((mod) => {
                const checked = activeModules.includes(mod.id);
                return (
                  <label
                    key={mod.id}
                    className={`flex items-start gap-2.5 p-2.5 rounded-md border cursor-pointer ${
                      checked ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleModule(mod.id)}
                      className="mt-0.5"
                    />
                    <div className="text-sm">
                      <div className="font-medium flex items-center gap-2">
                        {mod.name}
                        <Badge
                          variant={mod.maturity === "producao" ? "default" : "secondary"}
                          className="text-[10px] h-4"
                        >
                          {mod.maturity === "producao" ? "Produção" : "Preview"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{mod.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Notas do Contrato</Label>
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
