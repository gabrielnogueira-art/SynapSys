import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { Ban, CheckCircle2, ExternalLink, Eye, Plus, Search, Trash2 } from "lucide-react";
import { PlatformContract, PlatformUser, UserAccessLevel } from "@/platform/types";
import { switchToClientSimulation } from "@/platform/session";

interface PlatformUsersTabProps {
  contracts: PlatformContract[];
  users: PlatformUser[];
  onAddUser: (user: Omit<PlatformUser, "id" | "createdAt">) => void;
  onUpdateStatus: (userId: string, status: PlatformUser["status"]) => void;
  onDeleteUser: (userId: string) => void;
}

const ACCESS_LABELS: Record<UserAccessLevel, string> = {
  dono_plataforma: "Dono da Plataforma",
  gestor_contrato: "Gestor do Contrato",
  operador: "Operador / Secretário",
  professor: "Professor / Equipe",
};

export const PlatformUsersTab = ({
  contracts,
  users,
  onAddUser,
  onUpdateStatus,
  onDeleteUser,
}: PlatformUsersTabProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterContractId, setFilterContractId] = useState<string>("all");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [contractId, setContractId] = useState<string>(contracts[0]?.id ?? "");
  const [roleLabel, setRoleLabel] = useState("");
  const [accessLevel, setAccessLevel] = useState<UserAccessLevel>("gestor_contrato");

  const contractById = useMemo(
    () => new Map(contracts.map((c) => [c.id, c])),
    [contracts]
  );

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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !contractId) return;
    onAddUser({
      name: name.trim(),
      email: email.trim(),
      contractId,
      roleLabel: roleLabel.trim() || ACCESS_LABELS[accessLevel],
      accessLevel,
      authSource: contractById.get(contractId)?.authSource ?? "local",
      status: "ativo",
    });
    setName("");
    setEmail("");
    setRoleLabel("");
  };

  return (
    <div className="space-y-6">
      <Card className="border-indigo-200 bg-indigo-50/40">
        <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <p className="font-semibold text-indigo-950">
              Usuários reais do Supabase (Sistema EBD — CTR-001)
            </p>
            <p className="text-muted-foreground text-xs">
              Para aprovar cadastros pendentes ou criar logins reais na base Supabase do contrato CTR-001, acesse a Área Administrativa EBD.
            </p>
          </div>
          <Link to="/c/ctr-001-ebd-exemplo/login">
            <Button size="sm" variant="outline" className="bg-white">
              Abrir Login / Aprovações Supabase <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Vincular Novo Usuário a um Contrato</CardTitle>
          <CardDescription>
            Controle centralizado de quem acessa cada contrato vigente na plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
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
              <Label>Contrato *</Label>
              <Select value={contractId} onValueChange={setContractId}>
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
              <Label>Nível</Label>
              <Select
                value={accessLevel}
                onValueChange={(v) => setAccessLevel(v as UserAccessLevel)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor_contrato">Gestor do Contrato</SelectItem>
                  <SelectItem value="operador">Operador / Secretário</SelectItem>
                  <SelectItem value="professor">Professor / Equipe</SelectItem>
                  <SelectItem value="dono_plataforma">Dono da Plataforma</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Cargo / Papel</Label>
              <Input
                placeholder="Ex: Tesoureiro"
                value={roleLabel}
                onChange={(e) => setRoleLabel(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="text-base">Diretório de Usuários ({filtered.length})</CardTitle>
            <CardDescription>Visão unificada de acessos vinculados aos contratos</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
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
                <TableHead>Contrato</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Origem Auth</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum usuário encontrado com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((u) => {
                  const ctr = contractById.get(u.contractId);
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </TableCell>
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
                      <TableCell className="text-sm">{u.roleLabel}</TableCell>
                      <TableCell>
                        <Badge variant={u.authSource === "supabase" ? "default" : "secondary"}>
                          {u.authSource === "supabase" ? "Supabase" : "Local / Híbrido"}
                        </Badge>
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
                          {u.accessLevel !== "dono_plataforma" && u.status === "ativo" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              title="Testar o sistema com a visão restrita deste usuário"
                              onClick={() => {
                                switchToClientSimulation(u);
                                navigate(`/c/${u.contractId}`);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" /> Simular
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            title={u.status === "bloqueado" ? "Reativar" : "Bloquear"}
                            onClick={() =>
                              onUpdateStatus(
                                u.id,
                                u.status === "bloqueado" ? "ativo" : "bloqueado"
                              )
                            }
                          >
                            {u.status === "bloqueado" ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Ban className="h-4 w-4 text-amber-600" />
                            )}
                          </Button>
                          {u.accessLevel !== "dono_plataforma" && (
                            <Button
                              size="icon"
                              variant="ghost"
                              title="Remover usuário"
                              onClick={() => onDeleteUser(u.id)}
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
    </div>
  );
};
