import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Ban,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { getModuleById } from "@/platform/catalog";
import {
  ModuleId,
  PendingAccessRequest,
  PlatformContract,
  PlatformUser,
  UserAccessLevel,
} from "@/platform/types";
import { useToast } from "@/hooks/use-toast";
import { switchToClientSimulation } from "@/platform/session";

interface PlatformUsersTabProps {
  contracts: PlatformContract[];
  users: PlatformUser[];
  pendingRequests?: PendingAccessRequest[];
  onAddUser: (user: Omit<PlatformUser, "id" | "createdAt"> & { password: string }) => Promise<void>;
  onUpdateAccess?: (input: {
    membershipId: string;
    contractId: string;
    email: string;
    roleLabel: string;
    accessLevel: UserAccessLevel;
    allowedModules?: ModuleId[];
    moduleLevels?: Partial<Record<ModuleId, string>>;
    ebdAdmin?: boolean;
  }) => Promise<void>;
  onApprovePending?: (input: {
    pendingId: string;
    contractId: string;
    accessLevel: UserAccessLevel;
    roleLabel: string;
    allowedModules?: ModuleId[];
    moduleLevels?: Partial<Record<ModuleId, string>>;
    ebdAdmin?: boolean;
  }) => Promise<void>;
  onRejectPending?: (pendingId: string) => Promise<void>;
  onUpdateStatus: (userId: string, status: PlatformUser["status"]) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  isMaster?: boolean;
}

const ACCESS_LABELS: Record<UserAccessLevel, string> = {
  dono_plataforma: "Dono da Plataforma",
  gestor_contrato: "Gestor do Contrato",
  operador: "Operador / Secretário",
  professor: "Professor / Equipe",
};

const MODULE_LEVEL_OPTIONS: Record<ModuleId, Array<{ value: string; label: string }>> = {
  igreja_ebd: [
    { value: "admin", label: "Admin Geral EBD" },
    { value: "sede", label: "Gestor Sede" },
    { value: "regional", label: "Admin Regional" },
    { value: "secretario", label: "Secretário" },
    { value: "professor", label: "Professor" },
  ],
  igreja_tesouraria: [
    { value: "admin", label: "Tesoureiro Geral (Total)" },
    { value: "lancador", label: "Lançador Simplificado" },
    { value: "consulta", label: "Somente Consulta" },
  ],
  igreja_secretaria: [
    { value: "admin", label: "Secretário Geral (Total)" },
    { value: "operador", label: "Operador de Cadastros" },
    { value: "consulta", label: "Somente Consulta" },
  ],
  comercio_tesouraria: [
    { value: "admin", label: "Gestor (Total)" },
    { value: "operador", label: "Operador" },
    { value: "consulta", label: "Somente Consulta" },
  ],
  comercio_secretaria: [
    { value: "admin", label: "Gestor (Total)" },
    { value: "operador", label: "Operador" },
    { value: "consulta", label: "Somente Consulta" },
  ],
  comercio_estoque: [
    { value: "admin", label: "Gestor (Total)" },
    { value: "operador", label: "Operador" },
    { value: "consulta", label: "Somente Consulta" },
  ],
  comercio_rh: [
    { value: "admin", label: "Gestor (Total)" },
    { value: "operador", label: "Operador" },
    { value: "consulta", label: "Somente Consulta" },
  ],
  comercio_pdv: [
    { value: "admin", label: "Gestor (Total)" },
    { value: "operador", label: "Operador de Caixa" },
    { value: "consulta", label: "Somente Consulta" },
  ],
};

function levelLabelFor(modId: ModuleId, levelValue?: string): string | null {
  if (!levelValue) return null;
  return MODULE_LEVEL_OPTIONS[modId]?.find((o) => o.value === levelValue)?.label ?? levelValue;
}

export const PlatformUsersTab = ({
  contracts,
  users,
  pendingRequests = [],
  onAddUser,
  onUpdateAccess,
  onApprovePending,
  onRejectPending,
  onUpdateStatus,
  onDeleteUser,
  isMaster = true,
}: PlatformUsersTabProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const singleContractMode = contracts.length === 1;
  const singleContract = singleContractMode ? contracts[0] : undefined;

  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [filterContractId, setFilterContractId] = useState<string>("all");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contractId, setContractId] = useState<string>(contracts[0]?.id ?? "");
  const [roleLabel, setRoleLabel] = useState("");
  const [accessLevel, setAccessLevel] = useState<UserAccessLevel>(
    isMaster ? "gestor_contrato" : "operador"
  );
  const [allModulesAccess, setAllModulesAccess] = useState(true);
  const [selectedModules, setSelectedModules] = useState<ModuleId[]>(
    contracts[0]?.activeModules ?? []
  );
  const [createModuleLevels, setCreateModuleLevels] = useState<Partial<Record<ModuleId, string>>>({});
  const [ebdAdmin, setEbdAdmin] = useState(true);

  const [editingUser, setEditingUser] = useState<PlatformUser | null>(null);
  const [editRoleLabel, setEditRoleLabel] = useState("");
  const [editAccessLevel, setEditAccessLevel] = useState<UserAccessLevel>("operador");
  const [editAllModules, setEditAllModules] = useState(true);
  const [editModules, setEditModules] = useState<ModuleId[]>([]);
  const [editModuleLevels, setEditModuleLevels] = useState<Partial<Record<ModuleId, string>>>({});
  const [editEbdAdmin, setEditEbdAdmin] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);

  const [approvingReq, setApprovingReq] = useState<PendingAccessRequest | null>(null);
  const [approveContractId, setApproveContractId] = useState<string>(contracts[0]?.id ?? "");
  const [approveAccessLevel, setApproveAccessLevel] = useState<UserAccessLevel>("operador");
  const [approveRoleLabel, setApproveRoleLabel] = useState("");
  const [approveAllModules, setApproveAllModules] = useState(false);
  const [approveModules, setApproveModules] = useState<ModuleId[]>([]);
  const [approveModuleLevels, setApproveModuleLevels] = useState<Partial<Record<ModuleId, string>>>({});
  const [approveEbdAdmin, setApproveEbdAdmin] = useState(true);
  const [savingApproval, setSavingApproval] = useState(false);

  const contractById = useMemo(
    () => new Map(contracts.map((c) => [c.id, c])),
    [contracts]
  );

  const selectedContract = contractById.get(contractId);

  useEffect(() => {
    if (!contractId && contracts[0]) setContractId(contracts[0].id);
  }, [contracts, contractId]);

  useEffect(() => {
    if (selectedContract) {
      setSelectedModules(selectedContract.activeModules);
    }
  }, [contractId, selectedContract]);

  const scopedPending = useMemo(() => {
    if (singleContract) {
      return pendingRequests.filter(
        (p) => p.contractId === singleContract.id || (isMaster && p.contractId === null)
      );
    }
    return pendingRequests;
  }, [pendingRequests, singleContract, isMaster]);

  const toggleModuleInList = (
    modId: ModuleId,
    setAll: (v: boolean) => void,
    setList: React.Dispatch<React.SetStateAction<ModuleId[]>>
  ) => {
    setAll(false);
    setList((prev) =>
      prev.includes(modId)
        ? prev.length > 1
          ? prev.filter((m) => m !== modId)
          : prev
        : [...prev, modId]
    );
  };

  const openEditAccess = (u: PlatformUser) => {
    const ctr = contractById.get(u.contractId);
    const active = ctr?.activeModules ?? [];
    const hasSubset = Boolean(u.allowedModules && u.allowedModules.length > 0);
    setEditingUser(u);
    setEditRoleLabel(u.roleLabel);
    setEditAccessLevel(u.accessLevel);
    setEditAllModules(!hasSubset);
    setEditModules(hasSubset ? u.allowedModules! : active);
    setEditModuleLevels(u.moduleLevels ?? {});
    setEditEbdAdmin(u.ebdAdmin ?? u.accessLevel === "gestor_contrato");
  };

  const openApproveDialog = (req: PendingAccessRequest) => {
    const targetCtrId = req.contractId && contractById.has(req.contractId)
      ? req.contractId
      : singleContract?.id ?? contracts[0]?.id ?? "";
    const ctr = contractById.get(targetCtrId);
    const active = ctr?.activeModules ?? [];
    const reqMod =
      req.requestedArea && active.includes(req.requestedArea as ModuleId)
        ? (req.requestedArea as ModuleId)
        : undefined;
    setApprovingReq(req);
    setApproveContractId(targetCtrId);
    setApproveAccessLevel("operador");
    setApproveRoleLabel(req.notes || "");
    setApproveAllModules(!reqMod);
    setApproveModules(reqMod ? [reqMod] : active);
    setApproveModuleLevels({});
    setApproveEbdAdmin(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !onUpdateAccess) return;
    setSavingEdit(true);
    try {
      const ctr = contractById.get(editingUser.contractId);
      const effectiveAllowed = editAllModules
        ? undefined
        : editModules.filter((m) => ctr?.activeModules.includes(m));
      if (!editAllModules && (!effectiveAllowed || effectiveAllowed.length === 0)) {
        throw new Error("Selecione pelo menos uma área para este usuário.");
      }
      await onUpdateAccess({
        membershipId: editingUser.id,
        contractId: editingUser.contractId,
        email: editingUser.email,
        roleLabel: editRoleLabel.trim() || ACCESS_LABELS[editAccessLevel],
        accessLevel: editAccessLevel,
        allowedModules: effectiveAllowed,
        moduleLevels: editModuleLevels,
        ebdAdmin: editAccessLevel === "professor" ? false : editEbdAdmin,
      });
      toast({ title: "Permissões atualizadas com sucesso" });
      setEditingUser(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Não foi possível salvar permissões",
        description: err instanceof Error ? err.message : "Tente novamente.",
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleConfirmApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!approvingReq || !onApprovePending) return;
    const ctr = contractById.get(approveContractId);
    if (!ctr) return;
    const effectiveAllowed = approveAllModules
      ? undefined
      : approveModules.filter((m) => ctr.activeModules.includes(m));
    if (!approveAllModules && (!effectiveAllowed || effectiveAllowed.length === 0)) {
      toast({ variant: "destructive", title: "Selecione ao menos uma área." });
      return;
    }
    setSavingApproval(true);
    try {
      const modsToCheck = effectiveAllowed ?? ctr.activeModules;
      await onApprovePending({
        pendingId: approvingReq.id,
        contractId: ctr.id,
        accessLevel: approveAccessLevel,
        roleLabel: approveRoleLabel.trim() || ACCESS_LABELS[approveAccessLevel],
        allowedModules: effectiveAllowed,
        moduleLevels: approveModuleLevels,
        ebdAdmin:
          modsToCheck.includes("igreja_ebd") && approveAccessLevel !== "professor"
            ? approveEbdAdmin
            : false,
      });
      toast({ title: "Solicitação aprovada e acesso liberado!" });
      setApprovingReq(null);
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Falha ao aprovar solicitação",
        description: err instanceof Error ? err.message : "Verifique a Edge Function platform-users.",
      });
    } finally {
      setSavingApproval(false);
    }
  };

  const run = async (fn: () => Promise<void>) => {
    try {
      await fn();
      toast({ title: "Acesso atualizado" });
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Não foi possível atualizar",
        description: e instanceof Error ? e.message : "Erro ao atualizar.",
      });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filterContractId !== "all" && u.contractId !== filterContractId) return false;
      if (!q) return true;
      const ctr = contractById.get(u.contractId);
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.roleLabel.toLowerCase().includes(q) ||
        (ctr?.clientName.toLowerCase().includes(q) ?? false) ||
        (ctr?.code.toLowerCase().includes(q) ?? false)
      );
    });
  }, [users, search, filterContractId, contractById]);

  const effectiveCreateModules = allModulesAccess
    ? selectedContract?.activeModules ?? []
    : selectedModules;
  const createHasEbd = effectiveCreateModules.includes("igreja_ebd");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !contractId) return;
    if (!allModulesAccess && selectedModules.length === 0) {
      toast({
        variant: "destructive",
        title: "Selecione ao menos uma área",
        description: "Escolha quais módulos este usuário poderá acessar.",
      });
      return;
    }
    setSaving(true);
    try {
      await onAddUser({
        password,
        name: name.trim(),
        email: email.trim(),
        contractId,
        roleLabel: roleLabel.trim() || ACCESS_LABELS[accessLevel],
        accessLevel,
        authSource: selectedContract?.authSource ?? "supabase",
        status: "ativo",
        allowedModules: allModulesAccess ? undefined : selectedModules,
        moduleLevels: createModuleLevels,
        ebdAdmin: createHasEbd && accessLevel !== "professor" ? ebdAdmin : false,
      });
      setName("");
      setEmail("");
      setRoleLabel("");
      setPassword("");
      setAllModulesAccess(true);
      if (selectedContract) setSelectedModules(selectedContract.activeModules);
      setCreateModuleLevels({});
      setEbdAdmin(true);
      toast({ title: "Login criado e vinculado ao contrato" });
    } catch (e: unknown) {
      toast({
        variant: "destructive",
        title: "Falha ao criar login",
        description: e instanceof Error ? e.message : "Tente novamente.",
      });
    } finally {
      setSaving(false);
    }
  };

  const editContract = editingUser ? contractById.get(editingUser.contractId) : undefined;
  const editEffectiveModules = editAllModules
    ? editContract?.activeModules ?? []
    : editModules;
  const editHasEbd = editEffectiveModules.includes("igreja_ebd");

  const approveContract = contractById.get(approveContractId);
  const approveEffectiveModules = approveAllModules
    ? approveContract?.activeModules ?? []
    : approveModules;
  const approveHasEbd = approveEffectiveModules.includes("igreja_ebd");

  const renderModulePermissionPicker = (
    modules: ModuleId[],
    allFlag: boolean,
    setAllFlag: (v: boolean) => void,
    checkedList: ModuleId[],
    setCheckedList: React.Dispatch<React.SetStateAction<ModuleId[]>>,
    levels: Partial<Record<ModuleId, string>>,
    setLevels: React.Dispatch<React.SetStateAction<Partial<Record<ModuleId, string>>>>
  ) => (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-medium">Áreas e níveis por módulo</span>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox
            checked={allFlag}
            onCheckedChange={(checked) => {
              const isAll = Boolean(checked);
              setAllFlag(isAll);
              if (isAll) setCheckedList(modules);
            }}
          />
          <span>Todas as áreas do contrato</span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {modules.map((modId) => {
          const mod = getModuleById(modId);
          const checked = allFlag || checkedList.includes(modId);
          const levelOpts = MODULE_LEVEL_OPTIONS[modId] ?? [];
          const currentLevel = levels[modId] ?? levelOpts[0]?.value ?? "admin";
          return (
            <div
              key={modId}
              className={`flex flex-wrap items-center justify-between gap-2 px-2.5 py-2 rounded-md border text-xs ${
                checked ? "border-primary bg-primary/5" : "border-border text-muted-foreground"
              }`}
            >
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() =>
                    toggleModuleInList(modId, setAllFlag, setCheckedList)
                  }
                />
                <span>{mod?.shortName ?? modId}</span>
              </label>
              {checked && levelOpts.length > 0 && (
                <Select
                  value={currentLevel}
                  onValueChange={(v) => setLevels((prev) => ({ ...prev, [modId]: v }))}
                >
                  <SelectTrigger className="h-7 w-44 text-[11px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {levelOpts.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="active" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {singleContract
                ? `Logins & Acessos — ${singleContract.code} (${singleContract.clientName})`
                : "Logins & Solicitações de Acesso"}
            </h2>
            <p className="text-xs text-muted-foreground">
              {singleContract
                ? "Gerencie os logins, áreas liberadas, níveis por módulo e solicitações pendentes deste contrato."
                : "Visão consolidada. Você também pode abrir o botão Logins dentro de cada contrato."}
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="active">Logins Ativos ({users.length})</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              Solicitações Pendentes ({scopedPending.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Vincular Novo Usuário a um Contrato</CardTitle>
              <CardDescription>
                Crie o login e defina quais áreas e níveis internos (ex.: Tesoureiro Geral vs Lançador, Admin EBD vs Professor) esta conta terá.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                  <div className="space-y-1">
                    <Label>Nome *</Label>
                    <Input
                      placeholder="Nome completo"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>E-mail *</Label>
                    <Input
                      type="email"
                      placeholder="usuario@cliente.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="new-user-password">Senha inicial *</Label>
                    <Input
                      id="new-user-password"
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      minLength={8}
                      required
                    />
                  </div>
                  {!singleContractMode && (
                    <div className="space-y-1">
                      <Label>Contrato *</Label>
                      <Select value={contractId} onValueChange={setContractId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {contracts.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.code} — {c.clientName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <Label>Nível no Contrato</Label>
                    <Select
                      value={accessLevel}
                      onValueChange={(v) => {
                        const next = v as UserAccessLevel;
                        setAccessLevel(next);
                        if (next === "gestor_contrato") setEbdAdmin(true);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {isMaster && (
                          <SelectItem value="gestor_contrato">Gestor do Contrato (Total)</SelectItem>
                        )}
                        <SelectItem value="operador">Operador / Secretário</SelectItem>
                        <SelectItem value="professor">Professor / Equipe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className={`space-y-1 ${singleContractMode ? "md:col-span-2" : ""}`}>
                    <Label>Cargo / Papel</Label>
                    <Input
                      placeholder="Ex: Admin EBD, Tesoureiro"
                      value={roleLabel}
                      onChange={(e) => setRoleLabel(e.target.value)}
                    />
                  </div>
                </div>

                {selectedContract && selectedContract.activeModules.length > 0 && (
                  <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                    {renderModulePermissionPicker(
                      selectedContract.activeModules,
                      allModulesAccess,
                      setAllModulesAccess,
                      selectedModules,
                      setSelectedModules,
                      createModuleLevels,
                      setCreateModuleLevels
                    )}

                    {createHasEbd && accessLevel !== "professor" && (
                      <label className="flex items-center gap-2 text-xs pt-2 border-t border-border/60 cursor-pointer">
                        <Checkbox
                          checked={ebdAdmin}
                          onCheckedChange={(v) => setEbdAdmin(Boolean(v))}
                        />
                        <span>
                          Liberar acesso direto ao <strong>Painel Administrativo da EBD</strong> sem pedir segundo login
                        </span>
                      </label>
                    )}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    <Plus className="h-4 w-4 mr-1" /> {saving ? "Criando…" : "Adicionar usuário"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-4">
              <div>
                <CardTitle className="text-base">Diretório de Usuários ({filtered.length})</CardTitle>
                <CardDescription>
                  Visão de acessos, módulos liberados e níveis por usuário
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                {!singleContractMode && (
                  <Select value={filterContractId} onValueChange={setFilterContractId}>
                    <SelectTrigger className="w-56 h-9">
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
                )}
                <div className="relative w-60">
                  <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                  <Input
                    className="pl-8 h-9"
                    placeholder="Buscar usuário ou e-mail..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    {!singleContractMode && <TableHead>Contrato</TableHead>}
                    <TableHead>Papel</TableHead>
                    <TableHead>Áreas & Níveis</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={singleContractMode ? 5 : 6}
                        className="text-center text-muted-foreground py-8"
                      >
                        Nenhum usuário encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((u) => {
                      const ctr = contractById.get(u.contractId);
                      const canEditRow =
                        Boolean(onUpdateAccess) &&
                        u.accessLevel !== "dono_plataforma" &&
                        (isMaster || u.accessLevel !== "gestor_contrato");
                      const modsShown =
                        u.allowedModules && u.allowedModules.length > 0
                          ? u.allowedModules
                          : ctr?.activeModules ?? [];
                      return (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{u.name}</div>
                            <div className="text-xs text-muted-foreground">{u.email}</div>
                          </TableCell>
                          {!singleContractMode && (
                            <TableCell>
                              {ctr ? (
                                <div className="flex items-center gap-1.5">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {ctr.code}
                                  </Badge>
                                  <span className="text-xs truncate max-w-[180px]">
                                    {ctr.clientName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">-</span>
                              )}
                            </TableCell>
                          )}
                          <TableCell className="text-sm">{u.roleLabel}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {(!u.allowedModules || u.allowedModules.length === 0) &&
                              (!u.moduleLevels || Object.keys(u.moduleLevels).length === 0) ? (
                                <Badge variant="secondary" className="text-[11px]">
                                  Todas do contrato
                                </Badge>
                              ) : (
                                modsShown.map((modId) => {
                                  const lvl = levelLabelFor(modId, u.moduleLevels?.[modId]);
                                  return (
                                    <Badge key={modId} variant="outline" className="text-[11px]">
                                      {getModuleById(modId)?.shortName ?? modId}
                                      {lvl ? `: ${lvl}` : ""}
                                    </Badge>
                                  );
                                })
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                u.status === "ativo"
                                  ? "default"
                                  : u.status === "pendente"
                                  ? "secondary"
                                  : "destructive"
                              }
                            >
                              {u.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {isMaster &&
                                u.accessLevel !== "dono_plataforma" &&
                                u.status === "ativo" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs"
                                    title="Testar o sistema com a visão e permissões deste usuário"
                                    onClick={() => {
                                      switchToClientSimulation(u);
                                      navigate(ctr?.entryPath ?? `/c/${u.contractId}`);
                                    }}
                                  >
                                    <Eye className="h-3.5 w-3.5 mr-1" /> Simular
                                  </Button>
                                )}
                              {canEditRow && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  title="Editar áreas e permissões"
                                  onClick={() => openEditAccess(u)}
                                >
                                  <SlidersHorizontal className="h-4 w-4 text-primary" />
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                title={u.status === "bloqueado" ? "Reativar" : "Bloquear"}
                                disabled={!isMaster && u.accessLevel === "gestor_contrato"}
                                onClick={() =>
                                  run(() =>
                                    onUpdateStatus(
                                      u.id,
                                      u.status === "bloqueado" ? "ativo" : "bloqueado"
                                    )
                                  )
                                }
                              >
                                {u.status === "bloqueado" ? (
                                  <CheckCircle2 className="h-4 w-4 text-success" />
                                ) : (
                                  <Ban className="h-4 w-4 text-primary" />
                                )}
                              </Button>
                              {u.accessLevel !== "dono_plataforma" &&
                                (isMaster || u.accessLevel !== "gestor_contrato") && (
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    title="Remover usuário"
                                    onClick={() => run(() => onDeleteUser(u.id))}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Solicitações de Acesso Aguardando Aprovação ({scopedPending.length})
              </CardTitle>
              <CardDescription>
                Pessoas que solicitaram cadastro pela tela do contrato. Aprove definindo as áreas e níveis de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Solicitante</TableHead>
                    {!singleContractMode && <TableHead>Contrato</TableHead>}
                    <TableHead>Área Desejada</TableHead>
                    <TableHead>Observação</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scopedPending.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={singleContractMode ? 5 : 6}
                        className="text-center text-muted-foreground py-8"
                      >
                        Nenhuma solicitação de acesso pendente.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scopedPending.map((req) => {
                      const ctr = req.contractId ? contractById.get(req.contractId) : undefined;
                      const areaName = req.requestedArea
                        ? getModuleById(req.requestedArea as ModuleId)?.shortName ?? req.requestedArea
                        : "Geral";
                      return (
                        <TableRow key={req.id}>
                          <TableCell>
                            <div className="font-medium text-sm">{req.displayName}</div>
                            <div className="text-xs text-muted-foreground">{req.email}</div>
                          </TableCell>
                          {!singleContractMode && (
                            <TableCell className="text-xs">
                              {ctr ? `${ctr.code} — ${ctr.clientName}` : "Não vinculado"}
                            </TableCell>
                          )}
                          <TableCell>
                            <Badge variant="outline">{areaName}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {req.notes || "-"}
                          </TableCell>
                          <TableCell className="text-xs font-mono">{req.createdAt}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {onApprovePending && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2 text-xs text-emerald-700"
                                  onClick={() => openApproveDialog(req)}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" /> Aprovar
                                </Button>
                              )}
                              {onRejectPending && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-2 text-xs text-destructive"
                                  onClick={() =>
                                    run(() => onRejectPending(req.id))
                                  }
                                >
                                  <X className="h-3.5 w-3.5 mr-1" /> Recusar
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Editar permissões de usuário existente */}
      <Dialog
        open={Boolean(editingUser)}
        onOpenChange={(v) => {
          if (!v && !savingEdit) setEditingUser(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar permissões do usuário</DialogTitle>
            <DialogDescription>
              {editingUser?.name} ({editingUser?.email})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="edit-user-role-label">Cargo / Papel</Label>
                <Input
                  id="edit-user-role-label"
                  value={editRoleLabel}
                  onChange={(e) => setEditRoleLabel(e.target.value)}
                  disabled={savingEdit}
                />
              </div>

              {isMaster && (
                <div className="space-y-1">
                  <Label>Nível de acesso</Label>
                  <Select
                    value={editAccessLevel}
                    onValueChange={(v) => setEditAccessLevel(v as UserAccessLevel)}
                    disabled={savingEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gestor_contrato">Gestor do Contrato</SelectItem>
                      <SelectItem value="operador">Operador / Secretário</SelectItem>
                      <SelectItem value="professor">Professor / Equipe</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {editContract && (
              <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
                {renderModulePermissionPicker(
                  editContract.activeModules,
                  editAllModules,
                  setEditAllModules,
                  editModules,
                  setEditModules,
                  editModuleLevels,
                  setEditModuleLevels
                )}

                {editHasEbd && editAccessLevel !== "professor" && (
                  <label className="flex items-center gap-2 text-xs pt-2 border-t border-border/60 cursor-pointer">
                    <Checkbox
                      checked={editEbdAdmin}
                      onCheckedChange={(v) => setEditEbdAdmin(Boolean(v))}
                    />
                    <span>Acesso direto ao Painel Administrativo da EBD</span>
                  </label>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={savingEdit}
                onClick={() => setEditingUser(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingEdit}>
                {savingEdit ? "Salvando…" : "Salvar permissões"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal: Aprovar solicitação pendente */}
      <Dialog
        open={Boolean(approvingReq)}
        onOpenChange={(v) => {
          if (!v && !savingApproval) setApprovingReq(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Aprovar solicitação de acesso</DialogTitle>
            <DialogDescription>
              {approvingReq?.displayName} ({approvingReq?.email})
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmApprove} className="space-y-4">
            {!singleContractMode && (
              <div className="space-y-1">
                <Label>Contrato</Label>
                <Select value={approveContractId} onValueChange={setApproveContractId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {contracts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.code} — {c.clientName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Nível no Contrato</Label>
                <Select
                  value={approveAccessLevel}
                  onValueChange={(v) => setApproveAccessLevel(v as UserAccessLevel)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {isMaster && (
                      <SelectItem value="gestor_contrato">Gestor do Contrato</SelectItem>
                    )}
                    <SelectItem value="operador">Operador / Secretário</SelectItem>
                    <SelectItem value="professor">Professor / Equipe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Cargo / Papel</Label>
                <Input
                  placeholder="Ex: Tesoureiro"
                  value={approveRoleLabel}
                  onChange={(e) => setApproveRoleLabel(e.target.value)}
                />
              </div>
            </div>

            {approveContract && (
              <div className="rounded-lg border p-3 bg-muted/30 space-y-3">
                {renderModulePermissionPicker(
                  approveContract.activeModules,
                  approveAllModules,
                  setApproveAllModules,
                  approveModules,
                  setApproveModules,
                  approveModuleLevels,
                  setApproveModuleLevels
                )}
                {approveHasEbd && approveAccessLevel !== "professor" && (
                  <label className="flex items-center gap-2 text-xs pt-2 border-t border-border/60 cursor-pointer">
                    <Checkbox
                      checked={approveEbdAdmin}
                      onCheckedChange={(v) => setApproveEbdAdmin(Boolean(v))}
                    />
                    <span>Acesso direto ao Painel Administrativo da EBD</span>
                  </label>
                )}
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={savingApproval}
                onClick={() => setApprovingReq(null)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={savingApproval}>
                {savingApproval ? "Aprovando…" : "Aprovar e liberar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
