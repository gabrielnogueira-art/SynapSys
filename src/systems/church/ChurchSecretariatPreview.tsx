import { useMemo, useState } from "react";
import { useContractModuleData } from "@/platform/useContractModuleData";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileBadge2,
  Hash,
  HeartHandshake,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { EditableSelect } from "@/components/EditableSelect";
import { useToast } from "@/hooks/use-toast";

export type SecretariatSection = "dashboard" | "pessoas" | "igrejas" | "documentos" | "agenda";

export interface ChurchMember {
  id: string;
  matricula?: number;
  name: string;
  role: string;
  congregation: string;
  status: string;
  phone: string;
  email?: string;
  birthDate?: string;
  cpf?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  maritalStatus?: string;
  spouseMemberId?: string;
  spouseName?: string;
  marriageDate?: string;
  baptismDate?: string;
  memberSince?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChurchUnit {
  id: string;
  code: string;
  name: string;
  hierarchy: string;
  city: string;
  status: string;
}

export interface PastoralEvent {
  id: string;
  date: string;
  title: string;
  location: string;
  notes?: string;
}

export interface SecretariatCatalogs {
  roles: string[];
  statuses: string[];
  maritalStatuses: string[];
  congregations: string[];
  unitHierarchies: string[];
  unitStatuses: string[];
  documentTypes: string[];
}

export interface SecretariatStoreData {
  nextMatricula: number;
  members: ChurchMember[];
  events: PastoralEvent[];
  catalogs: SecretariatCatalogs;
}

const DEFAULT_CATALOGS: SecretariatCatalogs = {
  roles: [
    "Membro",
    "Congregado",
    "Auxiliar",
    "Diácono",
    "Presbítero",
    "Evangelista",
    "Pastor",
    "Missionário(a)",
  ],
  statuses: [
    "Ativo",
    "Congregado",
    "Carta Emitida",
    "Transferido",
    "Afastado",
    "Falecido",
  ],
  maritalStatuses: ["Solteiro(a)", "Casado(a)", "Viúvo(a)", "Divorciado(a)"],
  congregations: ["Igreja Sede"],
  unitHierarchies: ["Igreja Sede", "Regional", "Congregação", "Ponto de Pregação"],
  unitStatuses: ["Ativa", "Em implantação", "Inativa"],
  documentTypes: [
    "Carta de Mudança",
    "Carta de Recomendação",
    "Certificado de Batismo",
    "Apresentação de Criança",
    "Declaração de Membresia",
  ],
};

const DEFAULT_SECRETARIAT_DATA: SecretariatStoreData = {
  nextMatricula: 1,
  members: [],
  events: [],
  catalogs: DEFAULT_CATALOGS,
};

const DEFAULT_UNITS: ChurchUnit[] = [];
const PAGE_SIZE = 25;

function normalizeSecretariatData(raw: unknown): SecretariatStoreData {
  if (Array.isArray(raw)) {
    const legacy = raw as ChurchMember[];
    const members = legacy.map((m, idx) => ({
      ...m,
      matricula: m.matricula ?? legacy.length - idx,
    }));
    const maxMat = members.reduce((max, m) => Math.max(max, m.matricula ?? 0), 0);
    return {
      nextMatricula: maxMat + 1,
      members,
      events: [],
      catalogs: DEFAULT_CATALOGS,
    };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Partial<SecretariatStoreData>;
    const members = Array.isArray(obj.members) ? obj.members : [];
    const maxMat = members.reduce((max, m) => Math.max(max, m.matricula ?? 0), 0);
    const nextMatricula = Math.max(
      typeof obj.nextMatricula === "number" && obj.nextMatricula >= 1 ? obj.nextMatricula : 1,
      maxMat + 1
    );
    return {
      nextMatricula,
      members,
      events: Array.isArray(obj.events) ? obj.events : [],
      catalogs: {
        roles: obj.catalogs?.roles?.length ? obj.catalogs.roles : DEFAULT_CATALOGS.roles,
        statuses: obj.catalogs?.statuses?.length ? obj.catalogs.statuses : DEFAULT_CATALOGS.statuses,
        maritalStatuses: obj.catalogs?.maritalStatuses?.length
          ? obj.catalogs.maritalStatuses
          : DEFAULT_CATALOGS.maritalStatuses,
        congregations: obj.catalogs?.congregations?.length
          ? obj.catalogs.congregations
          : DEFAULT_CATALOGS.congregations,
        unitHierarchies: obj.catalogs?.unitHierarchies?.length
          ? obj.catalogs.unitHierarchies
          : DEFAULT_CATALOGS.unitHierarchies,
        unitStatuses: obj.catalogs?.unitStatuses?.length
          ? obj.catalogs.unitStatuses
          : DEFAULT_CATALOGS.unitStatuses,
        documentTypes: obj.catalogs?.documentTypes?.length
          ? obj.catalogs.documentTypes
          : DEFAULT_CATALOGS.documentTypes,
      },
    };
  }
  return DEFAULT_SECRETARIAT_DATA;
}

export const ChurchSecretariatPreview = ({
  contractId,
  clientName,
  activeSection = "dashboard",
  onChangeSection,
  moduleLevel = "admin",
}: {
  contractId: string;
  clientName: string;
  activeSection?: SecretariatSection;
  onChangeSection?: (s: SecretariatSection) => void;
  moduleLevel?: string;
}) => {
  const { toast } = useToast();
  const {
    value: rawSecretariat,
    update: setRawSecretariat,
    loading: membersLoading,
    error: membersError,
  } = useContractModuleData<SecretariatStoreData | ChurchMember[]>(
    contractId,
    "church_members",
    DEFAULT_SECRETARIAT_DATA
  );
  const {
    value: units,
    update: setUnits,
    loading: unitsLoading,
    error: unitsError,
  } = useContractModuleData(contractId, "church_units", DEFAULT_UNITS);

  const data = useMemo(() => normalizeSecretariatData(rawSecretariat), [rawSecretariat]);
  const members = data.members;
  const catalogs = data.catalogs;

  const isReadOnly = moduleLevel === "consulta";
  const canEditSequence = moduleLevel === "admin";
  const canManageCatalogs = !isReadOnly;

  const congregationOptions = useMemo(() => {
    const merged = new Set<string>([
      ...catalogs.congregations,
      ...units.map((u) => u.name),
    ]);
    return [...merged];
  }, [catalogs.congregations, units]);

  // Member creation form
  const [manualMatricula, setManualMatricula] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [cpf, setCpf] = useState("");
  const [address, setAddress] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("Solteiro(a)");
  const [spouseMemberId, setSpouseMemberId] = useState("");
  const [spouseName, setSpouseName] = useState("");
  const [marriageDate, setMarriageDate] = useState("");
  const [baptismDate, setBaptismDate] = useState("");
  const [memberSince, setMemberSince] = useState("");
  const [role, setRole] = useState(catalogs.roles[0] ?? "Membro");
  const [congregation, setCongregation] = useState(
    congregationOptions[0] ?? "Igreja Sede"
  );
  const [status, setStatus] = useState(catalogs.statuses[0] ?? "Ativo");
  const [notes, setNotes] = useState("");

  // Search, filters, pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [congregationFilter, setCongregationFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Edit member modal
  const [editingMember, setEditingMember] = useState<ChurchMember | null>(null);

  // Matricula sequence editor modal
  const [sequenceDialogOpen, setSequenceDialogOpen] = useState(false);
  const [nextSeqDraft, setNextSeqDraft] = useState("");

  // Units form
  const [unitName, setUnitName] = useState("");
  const [unitCity, setUnitCity] = useState("");
  const [unitHier, setUnitHier] = useState(
    catalogs.unitHierarchies[2] ?? "Congregação"
  );
  const [unitStatus, setUnitStatus] = useState(
    catalogs.unitStatuses[0] ?? "Ativa"
  );

  // Documents tab
  const [docMemberId, setDocMemberId] = useState("");
  const [docType, setDocType] = useState(
    catalogs.documentTypes[0] ?? "Carta de Mudança"
  );
  const [docNotes, setDocNotes] = useState("");

  // Agenda tab
  const [eventDate, setEventDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventLocation, setEventLocation] = useState("Templo Sede");
  const [eventNotes, setEventNotes] = useState("");

  const updateSecretariat = (
    updater: (prev: SecretariatStoreData) => SecretariatStoreData
  ) => {
    setRawSecretariat((prevRaw) => updater(normalizeSecretariatData(prevRaw)));
  };

  const updateCatalog = (key: keyof SecretariatCatalogs, nextOptions: string[]) => {
    updateSecretariat((prev) => ({
      ...prev,
      catalogs: {
        ...prev.catalogs,
        [key]: nextOptions,
      },
    }));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (congregationFilter !== "all" && m.congregation !== congregationFilter)
        return false;
      if (!q) return true;
      const matStr = m.matricula ? `#${m.matricula} ${m.matricula}` : "";
      return (
        matStr.includes(q) ||
        m.name.toLowerCase().includes(q) ||
        (m.phone?.toLowerCase().includes(q) ?? false) ||
        m.role.toLowerCase().includes(q) ||
        m.congregation.toLowerCase().includes(q) ||
        (m.spouseName?.toLowerCase().includes(q) ?? false) ||
        (m.city?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [members, search, statusFilter, congregationFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedMembers = useMemo(
    () =>
      filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filtered, currentPage]
  );

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members]
  );

  const activeCount = useMemo(
    () => members.filter((m) => m.status === "Ativo").length,
    [members]
  );
  const inactiveOrOtherCount = useMemo(
    () => members.filter((m) => m.status !== "Ativo").length,
    [members]
  );
  const lastIssuedMatricula = useMemo(
    () =>
      Math.max(
        0,
        data.nextMatricula - 1,
        ...members.map((m) => m.matricula ?? 0)
      ),
    [data.nextMatricula, members]
  );

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !name.trim()) return;

    let assignedMatricula = data.nextMatricula;
    if (manualMatricula.trim()) {
      const parsed = parseInt(manualMatricula.trim(), 10);
      if (Number.isNaN(parsed) || parsed < 1) {
        toast({
          variant: "destructive",
          title: "Número de matrícula inválido",
        });
        return;
      }
      if (members.some((m) => m.matricula === parsed)) {
        toast({
          variant: "destructive",
          title: `Matrícula #${parsed} já existe`,
          description: "Informe outro número ou deixe em branco para usar a sequência automática.",
        });
        return;
      }
      assignedMatricula = parsed;
    }

    const linkedSpouse = spouseMemberId ? memberById.get(spouseMemberId) : undefined;
    const nowIso = new Date().toISOString();
    const nextMember: ChurchMember = {
      id: `mb-${Date.now()}`,
      matricula: assignedMatricula,
      name: name.trim(),
      phone: phone.trim() || "-",
      email: email.trim() || undefined,
      birthDate: birthDate || undefined,
      cpf: cpf.trim() || undefined,
      address: address.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
      maritalStatus,
      spouseMemberId: spouseMemberId || undefined,
      spouseName: linkedSpouse ? linkedSpouse.name : spouseName.trim() || undefined,
      marriageDate: marriageDate || undefined,
      baptismDate: baptismDate || undefined,
      memberSince: memberSince || undefined,
      role: role || "Membro",
      congregation: congregation || "Igreja Sede",
      status: status || "Ativo",
      notes: notes.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    updateSecretariat((prev) => ({
      ...prev,
      nextMatricula: Math.max(prev.nextMatricula, assignedMatricula + 1),
      members: [nextMember, ...prev.members],
    }));

    setManualMatricula("");
    setName("");
    setPhone("");
    setEmail("");
    setBirthDate("");
    setCpf("");
    setAddress("");
    setNeighborhood("");
    setCity("");
    setSpouseMemberId("");
    setSpouseName("");
    setMarriageDate("");
    setBaptismDate("");
    setMemberSince("");
    setNotes("");
    setPage(1);
  };

  const handleSaveEditMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || isReadOnly || !editingMember.name.trim()) return;
    const linkedSpouse = editingMember.spouseMemberId
      ? memberById.get(editingMember.spouseMemberId)
      : undefined;
    const updated: ChurchMember = {
      ...editingMember,
      name: editingMember.name.trim(),
      phone: editingMember.phone.trim() || "-",
      spouseName: linkedSpouse
        ? linkedSpouse.name
        : editingMember.spouseName?.trim() || undefined,
      updatedAt: new Date().toISOString(),
    };

    updateSecretariat((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === updated.id ? updated : m)),
    }));
    setEditingMember(null);
  };

  const handleSaveNextSequence = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(nextSeqDraft.trim(), 10);
    if (Number.isNaN(parsed) || parsed < 1) {
      toast({ variant: "destructive", title: "Informe um número válido maior que zero." });
      return;
    }
    const minAllowed =
      members.reduce((max, m) => Math.max(max, m.matricula ?? 0), 0) + 1;
    if (parsed < minAllowed) {
      toast({
        variant: "destructive",
        title: `Número deve ser maior ou igual a ${minAllowed}`,
        description: "A sequência não pode retroceder abaixo das matrículas já emitidas.",
      });
      return;
    }
    updateSecretariat((prev) => ({
      ...prev,
      nextMatricula: parsed,
    }));
    setSequenceDialogOpen(false);
  };

  const handleAddUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !unitName.trim()) return;
    setUnits((prev) => [
      ...prev,
      {
        id: `un-${Date.now()}`,
        code: String(prev.length + 1),
        name: unitName.trim(),
        hierarchy: unitHier,
        city: unitCity.trim() || "-",
        status: unitStatus,
      },
    ]);
    setUnitName("");
    setUnitCity("");
  };

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly || !eventTitle.trim()) return;
    updateSecretariat((prev) => ({
      ...prev,
      events: [
        {
          id: `ev-${Date.now()}`,
          date: eventDate,
          title: eventTitle.trim(),
          location: eventLocation.trim() || "Igreja Sede",
          notes: eventNotes.trim() || undefined,
        },
        ...prev.events,
      ],
    }));
    setEventTitle("");
    setEventNotes("");
  };

  const handlePrintDocument = () => {
    const member = memberById.get(docMemberId);
    if (!member) {
      toast({ variant: "destructive", title: "Selecione um membro para emitir o documento." });
      return;
    }
    const esc = (s: string) =>
      s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
    const todayBr = new Date().toLocaleDateString("pt-BR");
    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${esc(docType)} - ${esc(member.name)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 720px; margin: 40px auto; padding: 24px; color: #111; line-height: 1.65; }
    h1 { text-align: center; font-size: 20px; text-transform: uppercase; margin-bottom: 4px; }
    h2 { text-align: center; font-size: 16px; border-top: 1px solid #444; border-bottom: 1px solid #444; padding: 8px 0; margin: 20px 0 28px; }
    .meta { background: #f8fafc; border: 1px solid #cbd5e1; padding: 14px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; }
    .sig { margin-top: 64px; text-align: center; }
    .sig-line { border-top: 1px solid #111; width: 280px; margin: 0 auto 6px; }
  </style>
</head>
<body>
  <h1>${esc(clientName)}</h1>
  <h2>${esc(docType)}</h2>
  <div class="meta">
    <strong>Matrícula:</strong> #${member.matricula ?? "-"} &nbsp;|&nbsp;
    <strong>Situação:</strong> ${esc(member.status)}<br />
    <strong>Nome completo:</strong> ${esc(member.name)}<br />
    <strong>Cargo / Função:</strong> ${esc(member.role)} &nbsp;|&nbsp;
    <strong>Congregação:</strong> ${esc(member.congregation)}<br />
    ${member.maritalStatus ? `<strong>Estado civil:</strong> ${esc(member.maritalStatus)}${member.spouseName ? ` (Cônjuge: ${esc(member.spouseName)})` : ""}<br />` : ""}
    ${member.birthDate ? `<strong>Nascimento:</strong> ${esc(member.birthDate)}<br />` : ""}
    ${member.address ? `<strong>Endereço:</strong> ${esc(member.address)}${member.city ? ` — ${esc(member.city)}` : ""}` : ""}
  </div>
  <p>Declaramos para os devidos fins que o(a) irmão(ã) <strong>${esc(member.name)}</strong>, matrícula nº <strong>#${member.matricula ?? "-"}</strong>, integra o rol desta igreja na função de <strong>${esc(member.role)}</strong> (${esc(member.congregation)}).</p>
  ${docNotes.trim() ? `<p><strong>Observações:</strong> ${esc(docNotes.trim())}</p>` : ""}
  <p style="margin-top: 28px;">Emitido em ${todayBr}.</p>
  <div class="sig">
    <div class="sig-line"></div>
    Secretaria / Pastor Responsável<br />
    ${esc(clientName)}
  </div>
</body>
</html>`;
    const popup = window.open("", "_blank", "width=820,height=720");
    if (popup) {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      setTimeout(() => popup.print(), 250);
    }
  };

  if (membersLoading || unitsLoading) {
    return <p className="p-6 text-muted-foreground">Carregando dados da Secretaria…</p>;
  }
  if (membersError || unitsError) {
    return (
      <p role="alert" className="p-6 text-destructive">
        {membersError || unitsError}
      </p>
    );
  }

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
              Matrícula permanente sequencial, ficha completa de membros e listas configuráveis no banco.
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="pessoas">Pessoas ({members.length})</TabsTrigger>
            <TabsTrigger value="igrejas">Igrejas ({units.length})</TabsTrigger>
            <TabsTrigger value="documentos">Documentos</TabsTrigger>
            <TabsTrigger value="agenda">Agenda ({data.events.length})</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Sequência de Matrículas</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Hash className="h-5 w-5 text-primary" /> #{lastIssuedMatricula}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Próxima: #{data.nextMatricula} (nunca é resetada)
                </p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Membros Ativos</CardDescription>
                <CardTitle className="text-2xl text-emerald-600 flex items-center gap-2">
                  <Users className="h-5 w-5" /> {activeCount}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  De {members.length} cadastrado(s) no sistema
                </p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Inativos / Cartas / Falecidos</CardDescription>
                <CardTitle className="text-2xl text-amber-600">
                  {inactiveOrOtherCount}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Mantêm matrícula histórica preservada
                </p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Igrejas / Congregações</CardDescription>
                <CardTitle className="text-2xl text-blue-600">{units.length}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos Cadastros no Rol</CardTitle>
              <CardDescription>
                Use a aba Pessoas para cadastro completo, busca por matrícula e filtros.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Congregação</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nenhum membro cadastrado ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    members.slice(0, 6).map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          #{m.matricula ?? "-"}
                        </TableCell>
                        <TableCell className="font-medium">{m.name}</TableCell>
                        <TableCell>{m.role}</TableCell>
                        <TableCell className="text-muted-foreground">{m.congregation}</TableCell>
                        <TableCell>
                          <Badge variant={m.status === "Ativo" ? "default" : "secondary"}>
                            {m.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pessoas" className="space-y-5">
          {!isReadOnly && (
            <Card>
              <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Cadastrar Membro / Obreiro</CardTitle>
                  <CardDescription>
                    Próxima matrícula automática: <strong>#{data.nextMatricula}</strong> (sequência permanente).
                  </CardDescription>
                </div>
                {canEditSequence && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setNextSeqDraft(String(data.nextMatricula));
                      setSequenceDialogOpen(true);
                    }}
                  >
                    <Hash className="h-3.5 w-3.5 mr-1.5" /> Ajustar próxima matrícula
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddMember} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="mb-matricula">Matrícula</Label>
                      <Input
                        id="mb-matricula"
                        type="number"
                        min={1}
                        placeholder={`Auto (#${data.nextMatricula})`}
                        value={manualMatricula}
                        onChange={(e) => setManualMatricula(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <Label htmlFor="mb-name">Nome completo *</Label>
                      <Input
                        id="mb-name"
                        placeholder="Nome completo do membro"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mb-phone">Telefone / WhatsApp</Label>
                      <Input
                        id="mb-phone"
                        placeholder="(21) 99999-9999"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mb-birth">Data de nascimento</Label>
                      <Input
                        id="mb-birth"
                        type="date"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label>Cargo / Função</Label>
                      <EditableSelect
                        label="Cargo / Função"
                        value={role}
                        onChange={setRole}
                        options={catalogs.roles}
                        onChangeOptions={(opts) => updateCatalog("roles", opts)}
                        canManageOptions={canManageCatalogs}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Congregação</Label>
                      <EditableSelect
                        label="Congregação"
                        value={congregation}
                        onChange={setCongregation}
                        options={congregationOptions}
                        onChangeOptions={(opts) => updateCatalog("congregations", opts)}
                        canManageOptions={canManageCatalogs}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Situação</Label>
                      <EditableSelect
                        label="Situação do Membro"
                        value={status}
                        onChange={setStatus}
                        options={catalogs.statuses}
                        onChangeOptions={(opts) => updateCatalog("statuses", opts)}
                        canManageOptions={canManageCatalogs}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Estado Civil</Label>
                      <EditableSelect
                        label="Estado Civil"
                        value={maritalStatus}
                        onChange={setMaritalStatus}
                        options={catalogs.maritalStatuses}
                        onChangeOptions={(opts) => updateCatalog("maritalStatuses", opts)}
                        canManageOptions={canManageCatalogs}
                      />
                    </div>
                  </div>

                  {maritalStatus.toLowerCase().includes("casad") && (
                    <div className="rounded-lg border bg-muted/30 p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="flex items-center gap-1">
                          <HeartHandshake className="h-3.5 w-3.5 text-primary" /> Vincular cônjuge cadastrado
                        </Label>
                        <Select
                          value={spouseMemberId || "__none__"}
                          onValueChange={(v) => {
                            const id = v === "__none__" ? "" : v;
                            setSpouseMemberId(id);
                            if (id) {
                              const sp = memberById.get(id);
                              if (sp) setSpouseName(sp.name);
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecionar membro (opcional)" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Informar nome manualmente</SelectItem>
                            {members.slice(0, 200).map((m) => (
                              <SelectItem key={m.id} value={m.id}>
                                #{m.matricula} — {m.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mb-spouse-name">Nome do cônjuge</Label>
                        <Input
                          id="mb-spouse-name"
                          placeholder="Nome completo do cônjuge"
                          value={spouseName}
                          onChange={(e) => {
                            setSpouseMemberId("");
                            setSpouseName(e.target.value);
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="mb-marriage-date">Data de casamento</Label>
                        <Input
                          id="mb-marriage-date"
                          type="date"
                          value={marriageDate}
                          onChange={(e) => setMarriageDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                    <div className="space-y-1 md:col-span-2">
                      <Label htmlFor="mb-address">Endereço (Rua, Nº, Complemento)</Label>
                      <Input
                        id="mb-address"
                        placeholder="Rua Exemplo, 123"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mb-neighborhood">Bairro</Label>
                      <Input
                        id="mb-neighborhood"
                        placeholder="Centro"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mb-city">Cidade / UF</Label>
                      <Input
                        id="mb-city"
                        placeholder="Rio de Janeiro - RJ"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mb-cpf">CPF (opcional)</Label>
                      <Input
                        id="mb-cpf"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mb-email">E-mail (opcional)</Label>
                      <Input
                        id="mb-email"
                        type="email"
                        placeholder="membro@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                    <div className="space-y-1">
                      <Label htmlFor="mb-baptism">Data de batismo</Label>
                      <Input
                        id="mb-baptism"
                        type="date"
                        value={baptismDate}
                        onChange={(e) => setBaptismDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mb-since">Membro desde</Label>
                      <Input
                        id="mb-since"
                        type="date"
                        value={memberSince}
                        onChange={(e) => setMemberSince(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="mb-notes">Observações</Label>
                      <Input
                        id="mb-notes"
                        placeholder="Anotações da secretaria..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button type="submit" className="w-full">
                      <Plus className="h-4 w-4 mr-1" /> Cadastrar Membro
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-base">
                  Rol de Membros ({filtered.length} de {members.length})
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <div className="relative w-64">
                    <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                    <Input
                      className="pl-8 h-9"
                      placeholder="Buscar matrícula, nome, telefone..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => {
                      setStatusFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-40 h-9">
                      <SelectValue placeholder="Situação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas situações</SelectItem>
                      {catalogs.statuses.map((st) => (
                        <SelectItem key={st} value={st}>
                          {st}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={congregationFilter}
                    onValueChange={(v) => {
                      setCongregationFilter(v);
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-44 h-9">
                      <SelectValue placeholder="Congregação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas congregações</SelectItem>
                      {congregationOptions.map((cg) => (
                        <SelectItem key={cg} value={cg}>
                          {cg}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matrícula</TableHead>
                    <TableHead>Nome / Estado Civil</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Congregação</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Situação</TableHead>
                    {!isReadOnly && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isReadOnly ? 6 : 7}
                        className="text-center text-muted-foreground py-8"
                      >
                        Nenhum membro encontrado com os filtros atuais.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedMembers.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-mono text-xs font-semibold">
                          #{m.matricula ?? "-"}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[
                              m.maritalStatus,
                              m.spouseName && `Cônjuge: ${m.spouseName}`,
                            ]
                              .filter(Boolean)
                              .join(" • ")}
                          </div>
                        </TableCell>
                        <TableCell>{m.role}</TableCell>
                        <TableCell className="text-muted-foreground">{m.congregation}</TableCell>
                        <TableCell className="text-xs">{m.phone}</TableCell>
                        <TableCell>
                          <Badge variant={m.status === "Ativo" ? "default" : "secondary"}>
                            {m.status}
                          </Badge>
                        </TableCell>
                        {!isReadOnly && (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={() => setEditingMember({ ...m })}
                            >
                              <Pencil className="h-3.5 w-3.5 mr-1" /> Ficha
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      Próxima <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="igrejas" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" /> Cadastro de Igrejas & Congregações
              </CardTitle>
              <CardDescription>
                Estrutura eclesiástica da Secretaria (hierarquia e status editáveis no banco).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isReadOnly && (
                <form
                  onSubmit={handleAddUnit}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
                >
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
                    <EditableSelect
                      label="Hierarquia"
                      value={unitHier}
                      onChange={setUnitHier}
                      options={catalogs.unitHierarchies}
                      onChangeOptions={(opts) => updateCatalog("unitHierarchies", opts)}
                      canManageOptions={canManageCatalogs}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Situação</Label>
                    <EditableSelect
                      label="Situação da Igreja"
                      value={unitStatus}
                      onChange={setUnitStatus}
                      options={catalogs.unitStatuses}
                      onChangeOptions={(opts) => updateCatalog("unitStatuses", opts)}
                      canManageOptions={canManageCatalogs}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Cidade / UF</Label>
                    <Input
                      placeholder="Cidade - UF"
                      value={unitCity}
                      onChange={(e) => setUnitCity(e.target.value)}
                    />
                  </div>
                  <Button type="submit">
                    <Plus className="h-4 w-4 mr-1" /> Incluir Igreja
                  </Button>
                </form>
              )}

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
                  {units.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-6">
                        Nenhuma congregação cadastrada ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    units.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs">{u.code}</TableCell>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.hierarchy}</TableCell>
                        <TableCell>{u.city}</TableCell>
                        <TableCell>
                          <Badge>{u.status}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
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
                Selecione um membro matriculado e o modelo de documento para impressão.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Membro / Obreiro</Label>
                  <Select value={docMemberId} onValueChange={setDocMemberId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um membro cadastrado" />
                    </SelectTrigger>
                    <SelectContent>
                      {members.slice(0, 200).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          #{m.matricula} — {m.name} ({m.status})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Tipo de Documento</Label>
                  <EditableSelect
                    label="Tipo de Documento"
                    value={docType}
                    onChange={setDocType}
                    options={catalogs.documentTypes}
                    onChangeOptions={(opts) => updateCatalog("documentTypes", opts)}
                    canManageOptions={canManageCatalogs}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="doc-notes">Observações / Destino (opcional)</Label>
                <Textarea
                  id="doc-notes"
                  rows={2}
                  placeholder="Ex.: Recomendado para a Igreja Evangélica em..."
                  value={docNotes}
                  onChange={(e) => setDocNotes(e.target.value)}
                />
              </div>
              <Button type="button" onClick={handlePrintDocument} disabled={!docMemberId}>
                <Printer className="h-4 w-4 mr-1.5" /> Gerar e Imprimir Documento
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agenda" className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" /> Agenda Pastoral & Eventos
              </CardTitle>
              <CardDescription>
                Cultos especiais, batismos, santa ceia e compromissos ministeriais de {clientName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isReadOnly && (
                <form
                  onSubmit={handleAddEvent}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
                >
                  <div className="space-y-1">
                    <Label htmlFor="ev-date">Data</Label>
                    <Input
                      id="ev-date"
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <Label htmlFor="ev-title">Evento / Compromisso *</Label>
                    <Input
                      id="ev-title"
                      placeholder="Ex.: Santa Ceia / Batismo nas Águas"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Local / Congregação</Label>
                    <EditableSelect
                      label="Local"
                      value={eventLocation}
                      onChange={setEventLocation}
                      options={congregationOptions}
                      onChangeOptions={(opts) => updateCatalog("congregations", opts)}
                      canManageOptions={canManageCatalogs}
                    />
                  </div>
                  <Button type="submit">
                    <Plus className="h-4 w-4 mr-1" /> Agendar
                  </Button>
                </form>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Local</TableHead>
                    {!isReadOnly && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.events.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={isReadOnly ? 3 : 4}
                        className="text-center text-muted-foreground py-6"
                      >
                        Nenhum evento agendado ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.events.map((ev) => (
                      <TableRow key={ev.id}>
                        <TableCell className="text-xs font-mono">{ev.date}</TableCell>
                        <TableCell className="font-medium">{ev.title}</TableCell>
                        <TableCell className="text-muted-foreground">{ev.location}</TableCell>
                        {!isReadOnly && (
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              title="Remover evento"
                              onClick={() =>
                                updateSecretariat((prev) => ({
                                  ...prev,
                                  events: prev.events.filter((x) => x.id !== ev.id),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal: Editar Ficha Completa do Membro */}
      <Dialog
        open={Boolean(editingMember)}
        onOpenChange={(v) => {
          if (!v) setEditingMember(null);
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Ficha do Membro — Matrícula #{editingMember?.matricula ?? "-"}
            </DialogTitle>
            <DialogDescription>
              Atualize dados cadastrais, estado civil, cônjuge e situação sem perder o número de matrícula.
            </DialogDescription>
          </DialogHeader>

          {editingMember && (
            <form onSubmit={handleSaveEditMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Nome completo *</Label>
                  <Input
                    value={editingMember.name}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Matrícula (permanente)</Label>
                  <Input value={`#${editingMember.matricula ?? "-"}`} disabled />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input
                    value={editingMember.phone}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Data de nascimento</Label>
                  <Input
                    type="date"
                    value={editingMember.birthDate ?? ""}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, birthDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>CPF</Label>
                  <Input
                    value={editingMember.cpf ?? ""}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, cpf: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Cargo / Função</Label>
                  <EditableSelect
                    label="Cargo / Função"
                    value={editingMember.role}
                    onChange={(v) => setEditingMember({ ...editingMember, role: v })}
                    options={catalogs.roles}
                    onChangeOptions={(opts) => updateCatalog("roles", opts)}
                    canManageOptions={canManageCatalogs}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Congregação</Label>
                  <EditableSelect
                    label="Congregação"
                    value={editingMember.congregation}
                    onChange={(v) =>
                      setEditingMember({ ...editingMember, congregation: v })
                    }
                    options={congregationOptions}
                    onChangeOptions={(opts) => updateCatalog("congregations", opts)}
                    canManageOptions={canManageCatalogs}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Situação</Label>
                  <EditableSelect
                    label="Situação"
                    value={editingMember.status}
                    onChange={(v) => setEditingMember({ ...editingMember, status: v })}
                    options={catalogs.statuses}
                    onChangeOptions={(opts) => updateCatalog("statuses", opts)}
                    canManageOptions={canManageCatalogs}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Estado civil</Label>
                  <EditableSelect
                    label="Estado Civil"
                    value={editingMember.maritalStatus ?? "Solteiro(a)"}
                    onChange={(v) =>
                      setEditingMember({ ...editingMember, maritalStatus: v })
                    }
                    options={catalogs.maritalStatuses}
                    onChangeOptions={(opts) => updateCatalog("maritalStatuses", opts)}
                    canManageOptions={canManageCatalogs}
                  />
                </div>
              </div>

              {(editingMember.maritalStatus ?? "").toLowerCase().includes("casad") && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border p-3 bg-muted/30">
                  <div className="space-y-1">
                    <Label>Cônjuge cadastrado</Label>
                    <Select
                      value={editingMember.spouseMemberId || "__none__"}
                      onValueChange={(v) => {
                        const id = v === "__none__" ? "" : v;
                        const sp = id ? memberById.get(id) : undefined;
                        setEditingMember({
                          ...editingMember,
                          spouseMemberId: id || undefined,
                          spouseName: sp ? sp.name : editingMember.spouseName,
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Opcional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Nome manual</SelectItem>
                        {members
                          .filter((m) => m.id !== editingMember.id)
                          .slice(0, 200)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              #{m.matricula} — {m.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Nome do cônjuge</Label>
                    <Input
                      value={editingMember.spouseName ?? ""}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          spouseMemberId: undefined,
                          spouseName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Data de casamento</Label>
                    <Input
                      type="date"
                      value={editingMember.marriageDate ?? ""}
                      onChange={(e) =>
                        setEditingMember({
                          ...editingMember,
                          marriageDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={editingMember.address ?? ""}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cidade / UF</Label>
                  <Input
                    value={editingMember.city ?? ""}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, city: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Batismo nas águas</Label>
                  <Input
                    type="date"
                    value={editingMember.baptismDate ?? ""}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, baptismDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Membro desde</Label>
                  <Input
                    type="date"
                    value={editingMember.memberSince ?? ""}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, memberSince: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea
                  rows={2}
                  value={editingMember.notes ?? ""}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, notes: e.target.value })
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingMember(null)}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar Ficha</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Ajustar próxima matrícula (migração / sequência permanente) */}
      <Dialog open={sequenceDialogOpen} onOpenChange={setSequenceDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sequência de Matrículas</DialogTitle>
            <DialogDescription>
              Defina o próximo número sequencial (ideal para continuar a numeração ao migrar um banco existente). Este contador nunca retrocede.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveNextSequence} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="next-mat-input">Próximo nº de matrícula</Label>
              <Input
                id="next-mat-input"
                type="number"
                min={1}
                value={nextSeqDraft}
                onChange={(e) => setNextSeqDraft(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setSequenceDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Atualizar sequência</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
