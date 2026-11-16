import { useEffect, useMemo, useRef, useState } from "react";
import { useContractModuleData } from "@/platform/useContractModuleData";
import { supabase } from "@/integrations/supabase/client";
import { useContractAccess } from "@/platform/useContractAccess";
import { useViewerSession } from "@/platform/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Landmark,
  Plus,
  Printer,
  Search,
  Settings2,
  Trash2,
  UserCheck,
  Wallet,
} from "lucide-react";
import { EditableSelect } from "@/components/EditableSelect";
import {
  ThermalChurchHeader,
  ThermalReceiptDialog,
  ThermalReceiptEntry,
} from "@/systems/church/ThermalReceiptDialog";
import { formatReferenceMonthLabel } from "@/systems/church/receiptFormat";
import { useToast } from "@/hooks/use-toast";

export type TreasurySection =
  | "dashboard"
  | "lancamento"
  | "entradas"
  | "saidas"
  | "conferencia"
  | "predefinicoes";

export interface TreasuryEntry {
  id: string;
  receiptNumber?: string;
  date: string;
  referenceMonth?: string;
  type: "entrada" | "saida";
  category: string;
  bankAccount?: string;
  paymentMethod?: string;
  contributorName?: string;
  contributorMemberId?: string;
  contributorMatricula?: number;
  contributorRole?: string;
  description: string;
  notes?: string;
  congregation: string;
  amount: number;
  createdAtIso?: string;
  createdByName?: string;
  createdByEmail?: string;
}

export interface TreasuryCatalogs {
  bankAccounts: string[];
  entryPurposes: string[];
  expenseCategories: string[];
  contributorRoles: string[];
  paymentMethods: string[];
  congregations: string[];
}

export interface TreasuryDefaults {
  defaultBankAccount: string;
  defaultPurpose: string;
  defaultExpenseCategory: string;
  defaultContributorRole: string;
  defaultPaymentMethod: string;
  defaultCongregation: string;
  autoReferenceMonthFromDate: boolean;
  autoOpenReceiptOnSave: boolean;
  receiptPaperWidth: "58mm" | "80mm";
  churchHeader: ThermalChurchHeader;
}

export interface TreasuryStoreData {
  nextReceiptSeq: number;
  entries: TreasuryEntry[];
  catalogs: TreasuryCatalogs;
  defaults: TreasuryDefaults;
}

interface MemberLookup {
  id: string;
  matricula?: number;
  name: string;
  role: string;
  congregation: string;
}

const DEFAULT_CATALOGS: TreasuryCatalogs = {
  bankAccounts: [
    "Caixa Geral (Dinheiro)",
    "Banco do Brasil — C/C",
    "Caixa Econômica Federal",
    "Conta PIX Igreja",
  ],
  entryPurposes: [
    "Dízimo de Membros",
    "Dízimo de Obreiros",
    "Dízimo de Pastor",
    "Oferta Geral",
    "Oferta de Missões",
    "Oferta de Construção",
    "Voto / Primícias",
  ],
  expenseCategories: [
    "Energia / Água / Internet",
    "Manutenção & Limpeza",
    "Missões & Ação Social",
    "Prebenda / Auxílio Pastoral",
    "Material de Expediente",
    "Eventos & Congressos",
  ],
  contributorRoles: [
    "Membro",
    "Obreiro",
    "Diácono",
    "Presbítero",
    "Evangelista",
    "Pastor",
    "Congregado",
    "Visitante",
  ],
  paymentMethods: [
    "Dinheiro",
    "PIX",
    "Cartão de Débito",
    "Cartão de Crédito",
    "Transferência Bancária",
  ],
  congregations: ["Igreja Sede"],
};

function makeDefaultTreasuryData(clientName: string): TreasuryStoreData {
  return {
    nextReceiptSeq: 1,
    entries: [],
    catalogs: DEFAULT_CATALOGS,
    defaults: {
      defaultBankAccount: DEFAULT_CATALOGS.bankAccounts[0],
      defaultPurpose: DEFAULT_CATALOGS.entryPurposes[0],
      defaultExpenseCategory: DEFAULT_CATALOGS.expenseCategories[0],
      defaultContributorRole: DEFAULT_CATALOGS.contributorRoles[0],
      defaultPaymentMethod: DEFAULT_CATALOGS.paymentMethods[0],
      defaultCongregation: DEFAULT_CATALOGS.congregations[0],
      autoReferenceMonthFromDate: true,
      autoOpenReceiptOnSave: true,
      receiptPaperWidth: "80mm",
      churchHeader: {
        churchName: clientName,
        subtitle: "Tesouraria Eclesiástica",
        cnpj: "",
        address: "",
        phone: "",
        footerMessage: "Deus abençoe a sua vida e sua oferta!",
      },
    },
  };
}

function normalizeTreasuryData(raw: unknown, clientName: string): TreasuryStoreData {
  const base = makeDefaultTreasuryData(clientName);
  if (Array.isArray(raw)) {
    return {
      ...base,
      nextReceiptSeq: raw.length + 1,
      entries: raw as TreasuryEntry[],
    };
  }
  if (raw && typeof raw === "object") {
    const obj = raw as Partial<TreasuryStoreData>;
    const entries = Array.isArray(obj.entries) ? obj.entries : [];
    const catalogs: TreasuryCatalogs = {
      bankAccounts: obj.catalogs?.bankAccounts?.length
        ? obj.catalogs.bankAccounts
        : DEFAULT_CATALOGS.bankAccounts,
      entryPurposes: obj.catalogs?.entryPurposes?.length
        ? obj.catalogs.entryPurposes
        : DEFAULT_CATALOGS.entryPurposes,
      expenseCategories: obj.catalogs?.expenseCategories?.length
        ? obj.catalogs.expenseCategories
        : DEFAULT_CATALOGS.expenseCategories,
      contributorRoles: obj.catalogs?.contributorRoles?.length
        ? obj.catalogs.contributorRoles
        : DEFAULT_CATALOGS.contributorRoles,
      paymentMethods: obj.catalogs?.paymentMethods?.length
        ? obj.catalogs.paymentMethods
        : DEFAULT_CATALOGS.paymentMethods,
      congregations: obj.catalogs?.congregations?.length
        ? obj.catalogs.congregations
        : DEFAULT_CATALOGS.congregations,
    };
    return {
      nextReceiptSeq: Math.max(
        typeof obj.nextReceiptSeq === "number" && obj.nextReceiptSeq >= 1
          ? obj.nextReceiptSeq
          : 1,
        entries.length + 1
      ),
      entries,
      catalogs,
      defaults: {
        ...base.defaults,
        ...(obj.defaults ?? {}),
        churchHeader: {
          ...base.defaults.churchHeader,
          ...(obj.defaults?.churchHeader ?? {}),
        },
      },
    };
  }
  return base;
}

const EMPTY_TREASURY_SENTINEL: TreasuryEntry[] = [];

function toThermalEntry(entry: TreasuryEntry): ThermalReceiptEntry {
  return {
    id: entry.id,
    receiptNumber: entry.receiptNumber || entry.id.slice(-6).toUpperCase(),
    date: entry.date,
    referenceMonth: entry.referenceMonth,
    type: entry.type,
    purpose: entry.category,
    bankAccount: entry.bankAccount || "Caixa Geral (Dinheiro)",
    paymentMethod: entry.paymentMethod || "Dinheiro",
    contributorName: entry.contributorName || entry.description,
    contributorMatricula: entry.contributorMatricula,
    contributorRole: entry.contributorRole || "Membro",
    congregation: entry.congregation || "Igreja Sede",
    description: entry.description,
    notes: entry.notes,
    amount: entry.amount,
    createdAtIso: entry.createdAtIso || `${entry.date}T12:00:00`,
    createdByName: entry.createdByName || "Tesouraria",
    createdByEmail: entry.createdByEmail || "-",
  };
}

export const ChurchTreasuryPreview = ({
  contractId,
  clientName,
  activeSection = "dashboard",
  onChangeSection,
  moduleLevel = "admin",
}: {
  contractId: string;
  clientName: string;
  activeSection?: TreasurySection;
  onChangeSection?: (s: TreasurySection) => void;
  moduleLevel?: string;
}) => {
  const { toast } = useToast();
  const access = useContractAccess(contractId);
  const session = useViewerSession();

  const {
    value: rawTreasury,
    update: setRawTreasury,
    loading,
    error,
  } = useContractModuleData<TreasuryStoreData | TreasuryEntry[]>(
    contractId,
    "church_treasury",
    EMPTY_TREASURY_SENTINEL
  );

  const data = useMemo(
    () => normalizeTreasuryData(rawTreasury, clientName),
    [rawTreasury, clientName]
  );
  const entries = data.entries;
  const catalogs = data.catalogs;
  const defaults = data.defaults;

  const isReadOnly = moduleLevel === "consulta";
  const isAdmin = moduleLevel === "admin";
  const canManageCatalogs = isAdmin;

  const currentOperator = useMemo(() => {
    if (session.mode === "client") {
      return { name: session.userName, email: session.userEmail };
    }
    return {
      name: access.userName || access.userEmail || "Tesouraria",
      email: access.userEmail || "master@plataforma",
    };
  }, [session, access.userName, access.userEmail]);

  // Optional silent read of Secretaria members & units (never fails if user lacks Secretaria access)
  const [memberDirectory, setMemberDirectory] = useState<MemberLookup[]>([]);
  const [unitNames, setUnitNames] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const loadSecretariatRefs = async () => {
      try {
        const { data: rows, error: err } = await supabase
          .from("platform_module_data")
          .select("module_key,data")
          .eq("contract_id", contractId)
          .in("module_key", ["church_members", "church_units"]);
        if (err || !rows || !active) return;
        for (const r of rows) {
          if (r.module_key === "church_members") {
            const rawMembers = Array.isArray(r.data)
              ? (r.data as MemberLookup[])
              : Array.isArray((r.data as { members?: MemberLookup[] })?.members)
              ? (r.data as { members: MemberLookup[] }).members
              : [];
            setMemberDirectory(rawMembers);
          } else if (r.module_key === "church_units" && Array.isArray(r.data)) {
            setUnitNames(
              (r.data as Array<{ name?: string }>)
                .map((u) => u.name)
                .filter((n): n is string => Boolean(n))
            );
          }
        }
      } catch {
        // Silent: user may only have Treasury permissions
      }
    };
    void loadSecretariatRefs();
    return () => {
      active = false;
    };
  }, [contractId]);

  const congregationOptions = useMemo(() => {
    return [...new Set([...catalogs.congregations, ...unitNames])];
  }, [catalogs.congregations, unitNames]);

  // Simplified Launch Form State
  const todayStr = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<"entrada" | "saida">(
    activeSection === "saidas" ? "saida" : "entrada"
  );
  const [entryDate, setEntryDate] = useState(todayStr);
  const [referenceMonth, setReferenceMonth] = useState(todayStr.slice(0, 7));
  const [manualMonthEdited, setManualMonthEdited] = useState(false);
  const [purpose, setPurpose] = useState(defaults.defaultPurpose);
  const [bankAccount, setBankAccount] = useState(defaults.defaultBankAccount);
  const [paymentMethod, setPaymentMethod] = useState(defaults.defaultPaymentMethod);
  const [contributorRole, setContributorRole] = useState(defaults.defaultContributorRole);
  const [congregation, setCongregation] = useState(defaults.defaultCongregation);
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [contributorMatricula, setContributorMatricula] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");

  // Receipt modal
  const [receiptEntry, setReceiptEntry] = useState<ThermalReceiptEntry | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Filters for Conferência / Movimentações
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterOperator, setFilterOperator] = useState("all");
  const [filterBankAccount, setFilterBankAccount] = useState("all");
  const [filterPurpose, setFilterPurpose] = useState("all");
  const [filterRefMonth, setFilterRefMonth] = useState("all");
  const [filterType, setFilterType] = useState<"all" | "entrada" | "saida">("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Defaults editor draft state
  const [defaultsDraft, setDefaultsDraft] = useState<TreasuryDefaults>(defaults);
  const lastDefaultsSigRef = useRef<string>("");
  const defaultsSig = JSON.stringify(defaults);

  useEffect(() => {
    if (lastDefaultsSigRef.current === defaultsSig) return;
    lastDefaultsSigRef.current = defaultsSig;
    setDefaultsDraft(defaults);
    setBankAccount(defaults.defaultBankAccount);
    setPaymentMethod(defaults.defaultPaymentMethod);
    setContributorRole(defaults.defaultContributorRole);
    setCongregation(defaults.defaultCongregation);
    setPurpose(
      type === "entrada" ? defaults.defaultPurpose : defaults.defaultExpenseCategory
    );
  }, [defaultsSig, defaults, type]);

  useEffect(() => {
    if (activeSection === "entradas" || activeSection === "lancamento") {
      setType("entrada");
      setPurpose(defaults.defaultPurpose);
      setFilterType(activeSection === "entradas" ? "entrada" : "all");
    } else if (activeSection === "saidas") {
      setType("saida");
      setPurpose(defaults.defaultExpenseCategory);
      setFilterType("saida");
    } else if (activeSection === "conferencia") {
      setFilterType("all");
    }
  }, [activeSection, defaults.defaultPurpose, defaults.defaultExpenseCategory]);

  const updateTreasury = (
    updater: (prev: TreasuryStoreData) => TreasuryStoreData,
    onDone?: (nextData: TreasuryStoreData) => void
  ) => {
    setRawTreasury((prevRaw) => {
      const next = updater(normalizeTreasuryData(prevRaw, clientName));
      onDone?.(next);
      return next;
    });
  };

  const updateCatalog = (key: keyof TreasuryCatalogs, nextOptions: string[]) => {
    updateTreasury((prev) => ({
      ...prev,
      catalogs: {
        ...prev.catalogs,
        [key]: nextOptions,
      },
    }));
  };

  const handleDateChange = (nextDate: string) => {
    setEntryDate(nextDate);
    if (
      defaults.autoReferenceMonthFromDate &&
      !manualMonthEdited &&
      /^\d{4}-\d{2}/.test(nextDate)
    ) {
      setReferenceMonth(nextDate.slice(0, 7));
    }
  };

  const handleMemberSelect = (memberId: string) => {
    if (memberId === "__manual__") {
      setSelectedMemberId("");
      setContributorMatricula(undefined);
      return;
    }
    const found = memberDirectory.find((m) => m.id === memberId);
    if (!found) return;
    setSelectedMemberId(found.id);
    setContributorName(found.name);
    setContributorMatricula(found.matricula);
    if (found.congregation) setCongregation(found.congregation);
    if (
      found.role &&
      catalogs.contributorRoles.some(
        (r) => r.toLowerCase() === found.role.toLowerCase()
      )
    ) {
      setContributorRole(found.role);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const numeric = parseFloat(amount.replace(",", "."));
    if (Number.isNaN(numeric) || numeric <= 0) {
      toast({ variant: "destructive", title: "Informe um valor válido maior que zero." });
      return;
    }
    const finalContributor = contributorName.trim() || (type === "entrada" ? "Oferta / Anônimo" : "Fornecedor");
    const seqNum = data.nextReceiptSeq;
    const receiptNumber = `REC-${String(seqNum).padStart(4, "0")}`;
    const nowIso = new Date().toISOString();

    const nextEntry: TreasuryEntry = {
      id: `tr-${Date.now()}`,
      receiptNumber,
      date: entryDate || todayStr,
      referenceMonth: type === "entrada" ? referenceMonth : referenceMonth || undefined,
      type,
      category: purpose,
      bankAccount,
      paymentMethod,
      contributorName: finalContributor,
      contributorMemberId: selectedMemberId || undefined,
      contributorMatricula,
      contributorRole,
      description: `${purpose} — ${finalContributor}`,
      notes: notes.trim() || undefined,
      congregation: congregation || "Igreja Sede",
      amount: numeric,
      createdAtIso: nowIso,
      createdByName: currentOperator.name,
      createdByEmail: currentOperator.email,
    };

    updateTreasury((prev) => ({
      ...prev,
      nextReceiptSeq: prev.nextReceiptSeq + 1,
      entries: [nextEntry, ...prev.entries],
    }));

    if (defaults.autoOpenReceiptOnSave) {
      setReceiptEntry(toThermalEntry(nextEntry));
      setReceiptOpen(true);
    }

    setContributorName("");
    setSelectedMemberId("");
    setContributorMatricula(undefined);
    setNotes("");
    setAmount("");
    setManualMonthEdited(false);
    if (defaults.autoReferenceMonthFromDate && /^\d{4}-\d{2}/.test(entryDate)) {
      setReferenceMonth(entryDate.slice(0, 7));
    }
  };

  const handleSaveDefaults = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    updateTreasury((prev) => ({
      ...prev,
      defaults: defaultsDraft,
    }));
    toast({ title: "Predefinições salvas no banco do contrato" });
  };

  const totals = useMemo(() => {
    const income = entries
      .filter((e) => e.type === "entrada")
      .reduce((s, e) => s + e.amount, 0);
    const expense = entries
      .filter((e) => e.type === "saida")
      .reduce((s, e) => s + e.amount, 0);
    return { income, expense, balance: income - expense };
  }, [entries]);

  const distinctOperators = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of entries) {
      const key = e.createdByEmail || e.createdByName || "Desconhecido";
      const label = e.createdByName
        ? e.createdByEmail && e.createdByName !== e.createdByEmail
          ? `${e.createdByName} (${e.createdByEmail})`
          : e.createdByName
        : key;
      map.set(key, label);
    }
    return [...map.entries()];
  }, [entries]);

  const distinctRefMonths = useMemo(() => {
    const set = new Set<string>();
    entries.forEach((e) => {
      if (e.referenceMonth) set.add(e.referenceMonth);
    });
    return [...set].sort().reverse();
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return entries.filter((e) => {
      if (filterType !== "all" && e.type !== filterType) return false;
      if (filterStartDate && e.date < filterStartDate) return false;
      if (filterEndDate && e.date > filterEndDate) return false;
      const opKey = e.createdByEmail || e.createdByName || "Desconhecido";
      if (filterOperator !== "all" && opKey !== filterOperator) return false;
      if (
        filterBankAccount !== "all" &&
        (e.bankAccount || "Caixa Geral (Dinheiro)") !== filterBankAccount
      ) {
        return false;
      }
      if (filterPurpose !== "all" && e.category !== filterPurpose) return false;
      if (filterRefMonth !== "all" && e.referenceMonth !== filterRefMonth) return false;
      if (!q) return true;
      return (
        (e.contributorName?.toLowerCase().includes(q) ?? false) ||
        e.description.toLowerCase().includes(q) ||
        (e.receiptNumber?.toLowerCase().includes(q) ?? false) ||
        (e.notes?.toLowerCase().includes(q) ?? false) ||
        (e.createdByName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [
    entries,
    filterType,
    filterStartDate,
    filterEndDate,
    filterOperator,
    filterBankAccount,
    filterPurpose,
    filterRefMonth,
    searchTerm,
  ]);

  const operatorSummary = useMemo(() => {
    const groups = new Map<
      string,
      {
        key: string;
        name: string;
        email: string;
        count: number;
        income: number;
        expense: number;
        byMethod: Record<string, number>;
      }
    >();
    for (const e of filteredEntries) {
      const key = e.createdByEmail || e.createdByName || "Desconhecido";
      const existing = groups.get(key) ?? {
        key,
        name: e.createdByName || key,
        email: e.createdByEmail || "",
        count: 0,
        income: 0,
        expense: 0,
        byMethod: {},
      };
      existing.count += 1;
      if (e.type === "entrada") {
        existing.income += e.amount;
        const pm = e.paymentMethod || "Dinheiro";
        existing.byMethod[pm] = (existing.byMethod[pm] ?? 0) + e.amount;
      } else {
        existing.expense += e.amount;
      }
      groups.set(key, existing);
    }
    return [...groups.values()];
  }, [filteredEntries]);

  const bankSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      const acct = e.bankAccount || "Caixa Geral (Dinheiro)";
      const delta = e.type === "entrada" ? e.amount : -e.amount;
      map.set(acct, (map.get(acct) ?? 0) + delta);
    }
    return [...map.entries()];
  }, [entries]);

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const renderQuickForm = () => (
    <Card>
      <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-base">
            Lançamento Simplificado (Dízimos, Ofertas & Movimentações)
          </CardTitle>
          <CardDescription>
            Preenchido com as predefinições configuradas (alteráveis a qualquer momento). Responsável:{" "}
            <strong>{currentOperator.name}</strong> ({currentOperator.email}).
          </CardDescription>
        </div>
        {isAdmin && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChangeSection?.("predefinicoes")}
          >
            <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Predefinições
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select
                value={type}
                onValueChange={(v: "entrada" | "saida") => {
                  setType(v);
                  setPurpose(
                    v === "entrada"
                      ? defaults.defaultPurpose
                      : defaults.defaultExpenseCategory
                  );
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada (Dízimo / Oferta)</SelectItem>
                  <SelectItem value="saida">Saída / Despesa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tr-date">Data do Lançamento</Label>
              <Input
                id="tr-date"
                type="date"
                value={entryDate}
                onChange={(e) => handleDateChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tr-ref-month">Mês de Referência</Label>
              <Input
                id="tr-ref-month"
                type="month"
                value={referenceMonth}
                onChange={(e) => {
                  setManualMonthEdited(true);
                  setReferenceMonth(e.target.value);
                }}
              />
              <p className="text-[11px] text-muted-foreground">
                {formatReferenceMonthLabel(referenceMonth)}
              </p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label>Conta Bancária / Caixa</Label>
              <EditableSelect
                label="Conta Bancária"
                value={bankAccount}
                onChange={setBankAccount}
                options={catalogs.bankAccounts}
                onChangeOptions={(opts) => updateCatalog("bankAccounts", opts)}
                canManageOptions={canManageCatalogs}
              />
            </div>

            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <EditableSelect
                label="Forma de Pagamento"
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={catalogs.paymentMethods}
                onChangeOptions={(opts) => updateCatalog("paymentMethods", opts)}
                canManageOptions={canManageCatalogs}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="space-y-1 md:col-span-2">
              <Label>
                {type === "entrada"
                  ? "Finalidade / Tipo de Receita"
                  : "Categoria de Despesa"}
              </Label>
              <EditableSelect
                label={type === "entrada" ? "Finalidade" : "Categoria de Despesa"}
                value={purpose}
                onChange={setPurpose}
                options={
                  type === "entrada"
                    ? catalogs.entryPurposes
                    : catalogs.expenseCategories
                }
                onChangeOptions={(opts) =>
                  updateCatalog(
                    type === "entrada" ? "entryPurposes" : "expenseCategories",
                    opts
                  )
                }
                canManageOptions={canManageCatalogs}
              />
            </div>

            <div className="space-y-1">
              <Label>Condição (Membro / Obreiro)</Label>
              <EditableSelect
                label="Condição do Contribuinte"
                value={contributorRole}
                onChange={setContributorRole}
                options={catalogs.contributorRoles}
                onChangeOptions={(opts) => updateCatalog("contributorRoles", opts)}
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

            {memberDirectory.length > 0 && (
              <div className="space-y-1 md:col-span-2">
                <Label>Buscar no Rol da Secretaria (opcional)</Label>
                <Select
                  value={selectedMemberId || "__manual__"}
                  onValueChange={handleMemberSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Digitar nome manualmente" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__manual__">Digitar nome manualmente</SelectItem>
                    {memberDirectory.slice(0, 200).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        #{m.matricula ?? "-"} — {m.name} ({m.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="tr-contributor">
                {type === "entrada"
                  ? "Nome do Dizimista / Ofertante *"
                  : "Favorecido / Descrição *"}
              </Label>
              <Input
                id="tr-contributor"
                placeholder={
                  type === "entrada"
                    ? "Nome completo (ou Oferta Anônima)"
                    : "Ex.: Conta de energia / Fornecedor"
                }
                value={contributorName}
                onChange={(e) => {
                  setSelectedMemberId("");
                  setContributorMatricula(undefined);
                  setContributorName(e.target.value);
                }}
                required
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label htmlFor="tr-notes">Observações do Recibo (opcional)</Label>
              <Input
                id="tr-notes"
                placeholder="Ex.: Culto da manhã / Referente a setembro..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tr-amount">Valor (R$) *</Label>
              <Input
                id="tr-amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <Button type="submit" className="w-full">
              <Plus className="h-4 w-4 mr-1" />
              {defaults.autoOpenReceiptOnSave ? "Salvar e Recibo" : "Lançar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderMovementsAndFilters = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" /> Conferência por Responsável & Filtros
              </CardTitle>
              <CardDescription>
                Filtre por data (ex.: culto da manhã/noite) e por quem lançou para conferir o caixa por operador.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={filterStartDate === todayStr && filterEndDate === todayStr ? "default" : "outline"}
                onClick={() => {
                  setFilterStartDate(todayStr);
                  setFilterEndDate(todayStr);
                }}
              >
                Hoje
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const ym = todayStr.slice(0, 7);
                  setFilterStartDate(`${ym}-01`);
                  setFilterEndDate(todayStr);
                }}
              >
                Este mês
              </Button>
              <Button
                type="button"
                size="sm"
                variant={!filterStartDate && !filterEndDate && filterOperator === "all" ? "secondary" : "ghost"}
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setFilterOperator("all");
                  setFilterBankAccount("all");
                  setFilterPurpose("all");
                  setFilterRefMonth("all");
                  setSearchTerm("");
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data inicial</Label>
              <Input
                type="date"
                className="h-9"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data final</Label>
              <Input
                type="date"
                className="h-9"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Responsável pelo lançamento</Label>
              <Select value={filterOperator} onValueChange={setFilterOperator}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Todos os responsáveis" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os responsáveis</SelectItem>
                  {distinctOperators.map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Buscar nome, recibo ou obs.</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-9"
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Conta bancária</Label>
              <Select value={filterBankAccount} onValueChange={setFilterBankAccount}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as contas</SelectItem>
                  {catalogs.bankAccounts.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Finalidade / Categoria</Label>
              <Select value={filterPurpose} onValueChange={setFilterPurpose}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as finalidades</SelectItem>
                  {[...new Set([...catalogs.entryPurposes, ...catalogs.expenseCategories])].map(
                    (p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mês de referência</Label>
              <Select value={filterRefMonth} onValueChange={setFilterRefMonth}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {distinctRefMonths.map((ym) => (
                    <SelectItem key={ym} value={ym}>
                      {formatReferenceMonthLabel(ym)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tipo</Label>
              <Select
                value={filterType}
                onValueChange={(v) => setFilterType(v as "all" | "entrada" | "saida")}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Entradas e Saídas</SelectItem>
                  <SelectItem value="entrada">Somente Entradas</SelectItem>
                  <SelectItem value="saida">Somente Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {operatorSummary.length > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resumo por Responsável ({operatorSummary.length}) — clique para filtrar
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {operatorSummary.map((op) => {
                  const selected = filterOperator === op.key;
                  return (
                    <button
                      key={op.key}
                      type="button"
                      onClick={() => setFilterOperator(selected ? "all" : op.key)}
                      className={`text-left rounded-lg border p-3 transition-all ${
                        selected
                          ? "border-primary bg-primary/5 ring-1 ring-primary"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-sm truncate">{op.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {op.count} lanç.
                        </Badge>
                      </div>
                      {op.email && (
                        <div className="text-[11px] text-muted-foreground truncate">
                          {op.email}
                        </div>
                      )}
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                        <span className="text-emerald-600 font-semibold">
                          + {brl(op.income)}
                        </span>
                        {op.expense > 0 && (
                          <span className="text-rose-600 font-semibold">
                            - {brl(op.expense)}
                          </span>
                        )}
                      </div>
                      {Object.keys(op.byMethod).length > 0 && (
                        <div className="mt-1.5 text-[11px] text-muted-foreground">
                          {Object.entries(op.byMethod)
                            .map(([pm, val]) => `${pm}: ${brl(val)}`)
                            .join(" • ")}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">
            Movimentações ({filteredEntries.length})
          </CardTitle>
          <div className="text-xs font-medium flex flex-wrap gap-3">
            <span className="text-emerald-600">
              Entradas filtro:{" "}
              {brl(
                filteredEntries
                  .filter((e) => e.type === "entrada")
                  .reduce((s, e) => s + e.amount, 0)
              )}
            </span>
            <span className="text-rose-600">
              Saídas filtro:{" "}
              {brl(
                filteredEntries
                  .filter((e) => e.type === "saida")
                  .reduce((s, e) => s + e.amount, 0)
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recibo / Data</TableHead>
                <TableHead>Contribuinte / Condição</TableHead>
                <TableHead>Finalidade / Ref.</TableHead>
                <TableHead>Conta / Pagamento</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Recibo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="text-xs">
                      <div className="font-mono font-semibold">
                        {entry.receiptNumber || "-"}
                      </div>
                      <div className="text-muted-foreground">{entry.date}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">
                        {entry.contributorName || entry.description}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[
                          entry.contributorMatricula && `#${entry.contributorMatricula}`,
                          entry.contributorRole,
                          entry.congregation,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium text-sm">{entry.category}</div>
                      {entry.referenceMonth && (
                        <div className="text-muted-foreground">
                          Ref.: {formatReferenceMonthLabel(entry.referenceMonth)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{entry.bankAccount || "Caixa Geral"}</div>
                      <div className="text-muted-foreground">
                        {entry.paymentMethod || "Dinheiro"}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="font-medium">{entry.createdByName || "-"}</div>
                      <div className="text-muted-foreground truncate max-w-[140px]">
                        {entry.createdByEmail || ""}
                      </div>
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        entry.type === "entrada" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {entry.type === "saida" ? "- " : "+ "}
                      {brl(entry.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          title="Visualizar e imprimir recibo térmico"
                          onClick={() => {
                            setReceiptEntry(toThermalEntry(entry));
                            setReceiptOpen(true);
                          }}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        {isAdmin && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="Remover lançamento"
                            onClick={() => {
                              if (confirm(`Remover lançamento ${entry.receiptNumber ?? ""}?`)) {
                                updateTreasury((prev) => ({
                                  ...prev,
                                  entries: prev.entries.filter((x) => x.id !== entry.id),
                                }));
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) return <p className="p-6 text-muted-foreground">Carregando dados da Tesouraria…</p>;
  if (error) return <p role="alert" className="p-6 text-destructive">{error}</p>;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <Tabs
        value={activeSection}
        onValueChange={(v) => onChangeSection?.(v as TreasurySection)}
        className="space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" /> Tesouraria Eclesiástica — {clientName}
            </h1>
            <p className="text-xs text-muted-foreground">
              Lançamento simplificado, predefinições de dízimo, recibo para bobina estreita e conferência por responsável.
            </p>
          </div>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="dashboard">Visão Geral</TabsTrigger>
            {!isReadOnly && <TabsTrigger value="lancamento">Lançamento Simplificado</TabsTrigger>}
            <TabsTrigger value="entradas">Entradas</TabsTrigger>
            <TabsTrigger value="saidas">Saídas</TabsTrigger>
            <TabsTrigger value="conferencia">Conferência ({entries.length})</TabsTrigger>
            {isAdmin && <TabsTrigger value="predefinicoes">Predefinições</TabsTrigger>}
          </TabsList>
        </div>

        <TabsContent value="dashboard" className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <ArrowUpCircle className="h-4 w-4 text-emerald-600" /> Entradas (Dízimos & Ofertas)
                </CardDescription>
                <CardTitle className="text-2xl text-emerald-600">{brl(totals.income)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <ArrowDownCircle className="h-4 w-4 text-rose-600" /> Saídas / Despesas
                </CardDescription>
                <CardTitle className="text-2xl text-rose-600">{brl(totals.expense)}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-1">
                  <Wallet className="h-4 w-4 text-primary" /> Saldo Total
                </CardDescription>
                <CardTitle className="text-2xl text-primary">{brl(totals.balance)}</CardTitle>
              </CardHeader>
            </Card>
          </div>

          {bankSummary.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Saldo por Conta Bancária / Caixa</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {bankSummary.map(([account, val]) => (
                  <div key={account} className="rounded-lg border p-3 bg-muted/30">
                    <div className="text-xs text-muted-foreground truncate">{account}</div>
                    <div className={`text-lg font-bold ${val >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                      {brl(val)}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {!isReadOnly && renderQuickForm()}
          {renderMovementsAndFilters()}
        </TabsContent>

        <TabsContent value="lancamento" className="space-y-5">
          {!isReadOnly && renderQuickForm()}
          {renderMovementsAndFilters()}
        </TabsContent>

        <TabsContent value="entradas" className="space-y-5">
          {!isReadOnly && renderQuickForm()}
          {renderMovementsAndFilters()}
        </TabsContent>

        <TabsContent value="saidas" className="space-y-5">
          {!isReadOnly && renderQuickForm()}
          {renderMovementsAndFilters()}
        </TabsContent>

        <TabsContent value="conferencia" className="space-y-5">
          {renderMovementsAndFilters()}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="predefinicoes" className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" /> Predefinições do Lançamento de Dízimo & Recibo
                </CardTitle>
                <CardDescription>
                  Defina os padrões carregados automaticamente no Lançamento Simplificado e os dados impressos no cupom da igreja.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveDefaults} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label>Conta bancária padrão</Label>
                      <EditableSelect
                        label="Conta Bancária"
                        value={defaultsDraft.defaultBankAccount}
                        onChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, defaultBankAccount: v })
                        }
                        options={catalogs.bankAccounts}
                        onChangeOptions={(opts) => updateCatalog("bankAccounts", opts)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Finalidade padrão (Entrada)</Label>
                      <EditableSelect
                        label="Finalidade"
                        value={defaultsDraft.defaultPurpose}
                        onChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, defaultPurpose: v })
                        }
                        options={catalogs.entryPurposes}
                        onChangeOptions={(opts) => updateCatalog("entryPurposes", opts)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Condição padrão (Membro / Obreiro)</Label>
                      <EditableSelect
                        label="Condição"
                        value={defaultsDraft.defaultContributorRole}
                        onChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, defaultContributorRole: v })
                        }
                        options={catalogs.contributorRoles}
                        onChangeOptions={(opts) => updateCatalog("contributorRoles", opts)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Forma de pagamento padrão</Label>
                      <EditableSelect
                        label="Forma de Pagamento"
                        value={defaultsDraft.defaultPaymentMethod}
                        onChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, defaultPaymentMethod: v })
                        }
                        options={catalogs.paymentMethods}
                        onChangeOptions={(opts) => updateCatalog("paymentMethods", opts)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Congregação padrão</Label>
                      <EditableSelect
                        label="Congregação"
                        value={defaultsDraft.defaultCongregation}
                        onChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, defaultCongregation: v })
                        }
                        options={congregationOptions}
                        onChangeOptions={(opts) => updateCatalog("congregations", opts)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Largura do rolo da impressora</Label>
                      <Select
                        value={defaultsDraft.receiptPaperWidth}
                        onValueChange={(v: "58mm" | "80mm") =>
                          setDefaultsDraft({ ...defaultsDraft, receiptPaperWidth: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="80mm">80mm (Bobina padrão cupom)</SelectItem>
                          <SelectItem value="58mm">58mm (Bobina mini estreita)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border p-3 bg-muted/30">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Puxar mês de referência pela data selecionada</Label>
                        <p className="text-xs text-muted-foreground">
                          Ainda permite alterar o mês manualmente em cada lançamento.
                        </p>
                      </div>
                      <Switch
                        checked={defaultsDraft.autoReferenceMonthFromDate}
                        onCheckedChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, autoReferenceMonthFromDate: v })
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <Label>Abrir recibo p/ download/impressão ao salvar</Label>
                        <p className="text-xs text-muted-foreground">
                          Abre automaticamente o cupom ao concluir o lançamento.
                        </p>
                      </div>
                      <Switch
                        checked={defaultsDraft.autoOpenReceiptOnSave}
                        onCheckedChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, autoOpenReceiptOnSave: v })
                        }
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4 space-y-3">
                    <h3 className="text-sm font-semibold">Dados da Igreja impressos no Recibo</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Nome da Igreja</Label>
                        <Input
                          value={defaultsDraft.churchHeader.churchName}
                          onChange={(e) =>
                            setDefaultsDraft({
                              ...defaultsDraft,
                              churchHeader: {
                                ...defaultsDraft.churchHeader,
                                churchName: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Subtítulo / Ministério</Label>
                        <Input
                          value={defaultsDraft.churchHeader.subtitle ?? ""}
                          onChange={(e) =>
                            setDefaultsDraft({
                              ...defaultsDraft,
                              churchHeader: {
                                ...defaultsDraft.churchHeader,
                                subtitle: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>CNPJ</Label>
                        <Input
                          placeholder="00.000.000/0001-00"
                          value={defaultsDraft.churchHeader.cnpj ?? ""}
                          onChange={(e) =>
                            setDefaultsDraft({
                              ...defaultsDraft,
                              churchHeader: {
                                ...defaultsDraft.churchHeader,
                                cnpj: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Telefone</Label>
                        <Input
                          placeholder="(21) 0000-0000"
                          value={defaultsDraft.churchHeader.phone ?? ""}
                          onChange={(e) =>
                            setDefaultsDraft({
                              ...defaultsDraft,
                              churchHeader: {
                                ...defaultsDraft.churchHeader,
                                phone: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label>Endereço completo</Label>
                        <Input
                          placeholder="Rua, Número, Bairro, Cidade - UF"
                          value={defaultsDraft.churchHeader.address ?? ""}
                          onChange={(e) =>
                            setDefaultsDraft({
                              ...defaultsDraft,
                              churchHeader: {
                                ...defaultsDraft.churchHeader,
                                address: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1 md:col-span-2">
                        <Label>Mensagem no rodapé do recibo</Label>
                        <Input
                          value={defaultsDraft.churchHeader.footerMessage ?? ""}
                          onChange={(e) =>
                            setDefaultsDraft({
                              ...defaultsDraft,
                              churchHeader: {
                                ...defaultsDraft.churchHeader,
                                footerMessage: e.target.value,
                              },
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit">Salvar Predefinições</Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <ThermalReceiptDialog
        open={receiptOpen}
        onOpenChange={setReceiptOpen}
        entry={receiptEntry}
        churchHeader={defaults.churchHeader}
        paperWidth={defaults.receiptPaperWidth}
      />
    </div>
  );
};
