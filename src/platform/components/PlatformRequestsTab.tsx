import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Copy, FolderGit2, Plus, Trash2 } from "lucide-react";
import { ChangeRequest, ModuleId, PlatformContract } from "@/platform/types";
import { buildAntigravityEditPrompt, getModuleById } from "@/platform/catalog";
import { useToast } from "@/hooks/use-toast";

interface PlatformRequestsTabProps {
  contracts: PlatformContract[];
  requests: ChangeRequest[];
  preselectedContractId?: string;
  onAddRequest: (req: Omit<ChangeRequest, "id" | "createdAt" | "status">) => Promise<void>;
  onUpdateStatus: (id: string, status: ChangeRequest["status"]) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
}

export const PlatformRequestsTab = ({
  contracts,
  requests,
  preselectedContractId,
  onAddRequest,
  onUpdateStatus,
  onDeleteRequest,
}: PlatformRequestsTabProps) => {
  const { toast } = useToast();
  const [contractId, setContractId] = useState<string>(
    preselectedContractId || contracts[0]?.id || ""
  );
  const [targetModule, setTargetModule] = useState<ModuleId | "geral">("geral");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [filterContractId, setFilterContractId] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const contractById = useMemo(
    () => new Map(contracts.map((c) => [c.id, c])),
    [contracts]
  );

  const selectedContract = contractById.get(contractId);

  const filteredRequests = useMemo(() => {
    return requests.filter(
      (r) => filterContractId === "all" || r.contractId === filterContractId
    );
  }, [requests, filterContractId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractId || !title.trim() || !description.trim()) return;
    try {
    await onAddRequest({
      contractId,
      targetModule,
      title: title.trim(),
      description: description.trim(),
    });
    setTitle("");
    setDescription("");
    toast({
      title: "Solicitação registrada!",
      description: "Use o botão 'Copiar Prompt p/ IA' quando quiser pedir a alteração aqui.",
    });
    } catch (e: any) { toast({ variant: "destructive", title: "Falha ao salvar solicitação", description: e.message }); }
  };

  const copyPrompt = async (req: ChangeRequest) => {
    const ctr = contractById.get(req.contractId);
    if (!ctr) return;
    const text = buildAntigravityEditPrompt(ctr, req);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(req.id);
      toast({
        title: "Prompt exato copiado!",
        description: `Cole no chat do Antigravity para alterar apenas ${ctr.code} (GitHub/${ctr.codeFolder}).`,
      });
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      toast({ title: "Não foi possível copiar automaticamente", description: text });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Registrar Solicitação de Alteração do Cliente
          </CardTitle>
          <CardDescription>
            Anote o que o cliente pediu e gere um prompt sem ambiguidades com o código do contrato e a pasta isolada dele.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label>Contrato do Cliente *</Label>
                <Select
                  value={contractId}
                  onValueChange={(v) => {
                    setContractId(v);
                    setTargetModule("geral");
                  }}
                >
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Módulo a Alterar</Label>
                <Select
                  value={targetModule}
                  onValueChange={(v) => setTargetModule(v as ModuleId | "geral")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="geral">Geral do contrato</SelectItem>
                    {(selectedContract?.activeModules ?? []).map((modId) => {
                      const mod = getModuleById(modId);
                      return (
                        <SelectItem key={modId} value={modId}>
                          {mod?.name ?? modId}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Pasta Alvo (Isolamento)</Label>
                <div className="h-10 px-3 rounded-md border bg-muted/40 flex items-center gap-1.5 text-xs font-mono text-muted-foreground truncate">
                  <FolderGit2 className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                  <span className="truncate">
                    {selectedContract ? `GitHub/${selectedContract.codeFolder}/` : "-"}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Título da Solicitação *</Label>
              <Input
                placeholder="Ex: Adicionar coluna de telefone no relatório da EBD"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Descrição detalhada do pedido *</Label>
              <Textarea
                rows={3}
                placeholder="Descreva exatamente o que o cliente solicitou..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit">
                <Plus className="h-4 w-4 mr-1.5" /> Registrar Solicitação
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">
          Fila de Adequações ({filteredRequests.length})
        </h3>
        <Select value={filterContractId} onValueChange={setFilterContractId}>
          <SelectTrigger className="w-64 h-9">
            <SelectValue placeholder="Filtrar contrato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os contratos</SelectItem>
            {contracts.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.code} — {c.clientName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              Nenhuma solicitação registrada para este filtro.
            </CardContent>
          </Card>
        ) : (
          filteredRequests.map((req) => {
            const ctr = contractById.get(req.contractId);
            const mod =
              req.targetModule !== "geral" ? getModuleById(req.targetModule) : undefined;
            return (
              <Card key={req.id}>
                <CardContent className="p-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {ctr && (
                          <Badge variant="outline" className="font-mono">
                            {ctr.code}
                          </Badge>
                        )}
                        <span className="font-semibold">{req.title}</span>
                        <Badge
                          variant={
                            req.status === "concluido"
                              ? "default"
                              : req.status === "em_andamento"
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {req.status === "solicitado"
                            ? "Solicitado"
                            : req.status === "em_andamento"
                            ? "Em andamento"
                            : "Concluído"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-3">
                        <span>Cliente: {ctr?.clientName ?? req.contractId}</span>
                        <span>•</span>
                        <span>Módulo: {mod ? mod.name : "Geral"}</span>
                        {ctr && (
                          <>
                            <span>•</span>
                            <span className="font-mono">GitHub/{ctr.codeFolder}/</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Select
                        value={req.status}
                        onValueChange={(v) =>
                          onUpdateStatus(req.id, v as ChangeRequest["status"]).catch((e) => toast({ variant: "destructive", title: "Falha ao atualizar", description: e.message }))
                        }
                      >
                        <SelectTrigger className="h-8 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="solicitado">Solicitado</SelectItem>
                          <SelectItem value="em_andamento">Em andamento</SelectItem>
                          <SelectItem value="concluido">Concluído</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => copyPrompt(req)}
                        className="h-8 text-xs"
                      >
                        {copiedId === req.id ? (
                          <>
                            <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 mr-1" /> Copiar Prompt p/ IA
                          </>
                        )}
                      </Button>

                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => onDeleteRequest(req.id).catch((e) => toast({ variant: "destructive", title: "Falha ao excluir", description: e.message }))
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground bg-muted/40 rounded p-2.5">
                    {req.description}
                  </p>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
