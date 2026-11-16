import { useContractModuleData } from "@/platform/useContractModuleData";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpenCheck, Building2, CalendarDays, FileBadge2, Plus, Search, Users } from "lucide-react";

export type SecretariatSection = "dashboard" | "pessoas" | "igrejas" | "documentos" | "agenda";

interface ChurchMember {
  id: string;
  name: string;
  role: string;
  congregation: string;
  status: "Ativo" | "Congregado" | "Carta Emitida";
  phone: string;
}

interface ChurchUnit {
  id: string;
  code: string;
  name: string;
  hierarchy: "Igreja Sede" | "Regional" | "Congregação";
  city: string;
  status: "Ativa" | "Em implantação";
}

const DEFAULT_MEMBERS: ChurchMember[] = [];
const DEFAULT_UNITS: ChurchUnit[] = [];

export const ChurchSecretariatPreview = ({
  contractId,
  clientName,
  activeSection = "dashboard",
  onChangeSection,
}: {
  contractId: string;
  clientName: string;
  activeSection?: SecretariatSection;
  onChangeSection?: (s: SecretariatSection) => void;
}) => {
  const { value: members, update: setMembers, loading: membersLoading, error: membersError } = useContractModuleData(contractId, "church_members", DEFAULT_MEMBERS);
  const { value: units, update: setUnits, loading: unitsLoading, error: unitsError } = useContractModuleData(contractId, "church_units", DEFAULT_UNITS);

  const [search, setSearch] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("Membro");
  const [congregation, setCongregation] = useState("Igreja Sede");
  const [status, setStatus] = useState<ChurchMember["status"]>("Ativo");

  const [unitName, setUnitName] = useState("");
  const [unitCity, setUnitCity] = useState("");
  const [unitHier, setUnitHier] = useState<ChurchUnit["hierarchy"]>("Congregação");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.congregation.toLowerCase().includes(q)
    );
  }, [members, search]);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setMembers((prev) => [
      {
        id: `mb-${Date.now()}`,
        name: name.trim(),
        role: role.trim() || "Membro",
        congregation: congregation.trim() || "Igreja Sede",
        status,
        phone: "-",
      },
      ...prev,
    ]);
    setName("");
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitName.trim()) return;
    setUnits((prev) => [
      ...prev,
      {
        id: `un-${Date.now()}`,
        code: String(prev.length + 1),
        name: unitName.trim(),
        hierarchy: unitHier,
        city: unitCity.trim() || "-",
        status: "Ativa",
      },
    ]);
    setUnitName("");
    setUnitCity("");
  };

  if (membersLoading || unitsLoading) return <p className="p-6 text-muted-foreground">Carregando dados…</p>;
  if (membersError || unitsError) return <p role="alert" className="p-6 text-destructive">{membersError || unitsError}</p>;
  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Tabs
        value={activeSection}
        onValueChange={(v) => onChangeSection?.(v as SecretariatSection)}
        className="space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <BookOpenCheck className="h-5 w-5 text-primary" /> Secretaria — {clientName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Gestão de pessoas, igrejas/congregações, emissão de cartas e agenda pastoral.
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="pessoas">Pessoas ({members.length})</TabsTrigger>
            <TabsTrigger value="igrejas">Igrejas ({units.length})</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total no Rol</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> {members.length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Membros Ativos</CardDescription>
                <CardTitle className="text-2xl text-emerald-600">
                  {members.filter((m) => m.status === "Ativo").length}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Igrejas / Congregações</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{units.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Cartas / Pendentes</CardDescription>
                <CardTitle className="text-2xl text-amber-600">
                  {members.filter((m) => m.status !== "Ativo").length}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo de Pessoas Recentes</CardTitle>
              <CardDescription>Use as abas acima ou o menu lateral para cadastros completos.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Congregação</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.slice(0, 5).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.role}</TableCell>
                      <TableCell className="text-muted-foreground">{m.congregation}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === "Ativo" ? "default" : "secondary"}>
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pessoas" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cadastrar Membro / Obreiro</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMember} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                <div className="space-y-1 md:col-span-2">
                  <Label>Nome completo</Label>
                  <Input
                    placeholder="Nome do membro"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cargo / Função</Label>
                  <Input value={role} onChange={(e) => setRole(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Congregação</Label>
                  <Input value={congregation} onChange={(e) => setCongregation(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Situação</Label>
                  <Select value={status} onValueChange={(v: ChurchMember["status"]) => setStatus(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Congregado">Congregado</SelectItem>
                      <SelectItem value="Carta Emitida">Carta Emitida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Cadastrar
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base">Rol de Membros ({filtered.length})</CardTitle>
              <div className="relative w-64">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Buscar membro ou cargo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Congregação</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.name}</TableCell>
                      <TableCell>{m.role}</TableCell>
                      <TableCell className="text-muted-foreground">{m.congregation}</TableCell>
                      <TableCell className="text-xs">{m.phone}</TableCell>
                      <TableCell>
                        <Badge variant={m.status === "Ativo" ? "default" : "secondary"}>
                          {m.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="igrejas" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Cadastro de Igrejas & Congregações
              </CardTitle>
              <CardDescription>Estrutura eclesiástica da Secretaria</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form onSubmit={handleAddUnit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <Label>Nome da Igreja / Congregação</Label>
                  <Input
                    placeholder="Ex: Congregação Esperança Norte"
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Hierarquia</Label>
                  <Select value={unitHier} onValueChange={(v: ChurchUnit["hierarchy"]) => setUnitHier(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Igreja Sede">Igreja Sede</SelectItem>
                      <SelectItem value="Regional">Regional</SelectItem>
                      <SelectItem value="Congregação">Congregação</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Cidade / UF</Label>
                  <Input placeholder="Cidade - UF" value={unitCity} onChange={(e) => setUnitCity(e.target.value)} />
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-1" /> Incluir Igreja
                </Button>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Hierarquia</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-mono text-xs">{u.code}</TableCell>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.hierarchy}</TableCell>
                      <TableCell>{u.city}</TableCell>
                      <TableCell><Badge>{u.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileBadge2 className="h-4 w-4 text-primary" /> Emissão de Documentos & Cartas
              </CardTitle>
              <CardDescription>
                Cartas de mudança, certificados de batismo, apresentação de crianças e atas.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Módulo pronto para receber modelos de impressão personalizados para {clientName}.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agenda">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Agenda Pastoral & Eventos
              </CardTitle>
              <CardDescription>
                Cultos especiais, batismos, santa ceia e compromissos ministeriais.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Área dedicada ao calendário oficial de {clientName}.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
