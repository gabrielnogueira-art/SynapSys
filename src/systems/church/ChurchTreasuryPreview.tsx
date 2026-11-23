import { useEffect, useMemo, useRef, useState } from "react";
import { useContractModuleData } from "@/platform/useContractModuleData";
import { supabase } from "@/integrations/supabase/client";
import { useContractAccess } from "@/platform/useContractAccess";
import { useViewerSession } from "@/platform/session";
import {
  buildTreasuryClosingReportHtml,
  buildTreasuryCsv,
  computeTreasuryReports,
  findMemberByMatriculaInput,
  resolveEffectiveCongregation,
  suggestAccountPlanForRole,
} from "@/systems/church/churchMetrics";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Landmark,
  Loader2,
  Paperclip,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Settings2,
  Trash2,
  UserCheck,
  Wallet,
  X,
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
  | "relatorios"
  | "predefinicoes";

export interface TreasuryEntry {
  id: string;
  receiptNumber?: string;
  date: string;
  referenceMonth?: string;
  type: "entrada" | "saida";
  category: string;
  department?: string;
  documentType?: string;
  bankAccount?: string;
  paymentMethod?: string;
  contributorName?: string;
  contributorMemberId?: string;
  contributorMatricula?: number;
  contributorRole?: string;
  pixE2E?: string;
  attachmentName?: string;
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
  departments: string[];
  documentTypes: string[];
  entryPurposes: string[];
  expenseCategories: string[];
  contributorRoles: string[];
  paymentMethods: string[];
  congregations: string[];
}

export interface TreasuryDefaults {
  defaultBankAccount: string;
  defaultDepartment: string;
  defaultDocumentType: string;
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
  departments: [
    "1 - Tesouraria",
    "EBD",
    "Mocidade / Jovens",
    "Missões",
    "Ação Social",
    "Obras / Construção",
  ],
  documentTypes: [
    "Recibo",
    "Comprovante PIX",
    "Dinheiro em Espécie",
    "Transferência Bancária",
    "Nota Fiscal",
    "Carnê / Boleto",
  ],
  entryPurposes: [
    "01.010 - Dízimo de Membros",
    "01.015 - Dízimo de Obreiros",
    "01.020 - Dízimo de Pastor",
    "02.001 - Oferta Geral",
    "02.010 - Oferta de Missões",
    "02.020 - Oferta de Construção",
    "02.030 - Voto / Primícias",
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
      defaultDepartment: DEFAULT_CATALOGS.departments[0],
      defaultDocumentType: DEFAULT_CATALOGS.documentTypes[0],
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
      departments: obj.catalogs?.departments?.length
        ? obj.catalogs.departments
        : DEFAULT_CATALOGS.departments,
      documentTypes: obj.catalogs?.documentTypes?.length
        ? obj.catalogs.documentTypes
        : DEFAULT_CATALOGS.documentTypes,
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
    department: entry.department,
    documentType: entry.documentType,
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
              ? (r.data as unknown as MemberLookup[])
              : Array.isArray((r.data as unknown as { members?: MemberLookup[] })?.members)
              ? (r.data as unknown as { members: MemberLookup[] }).members
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

  const effectiveCongregationInfo = useMemo(
    () =>
      resolveEffectiveCongregation({
        sessionCongregation:
          session.mode === "client" ? session.assignedCongregation : null,
        accessCongregation: access.assignedCongregation,
        configuredDefault: defaults.defaultCongregation,
      }),
    [session, access.assignedCongregation, defaults.defaultCongregation]
  );

  const congregationOptions = useMemo(() => {
    return [
      ...new Set([
        ...catalogs.congregations,
        ...unitNames,
        effectiveCongregationInfo.congregation,
      ]),
    ].filter(Boolean);
  }, [catalogs.congregations, unitNames, effectiveCongregationInfo.congregation]);

  // Simplified Launch Form State
  const todayStr = new Date().toISOString().slice(0, 10);
  const [type, setType] = useState<"entrada" | "saida">(
    activeSection === "saidas" ? "saida" : "entrada"
  );
  const [entryDate, setEntryDate] = useState(todayStr);
  const [referenceMonth, setReferenceMonth] = useState(todayStr.slice(0, 7));
  const [manualMonthEdited, setManualMonthEdited] = useState(false);
  const [purpose, setPurpose] = useState(defaults.defaultPurpose);
  const [department, setDepartment] = useState(defaults.defaultDepartment);
  const [documentType, setDocumentType] = useState(defaults.defaultDocumentType);
  const [bankAccount, setBankAccount] = useState(defaults.defaultBankAccount);
  const [paymentMethod, setPaymentMethod] = useState(defaults.defaultPaymentMethod);
  const [contributorRole, setContributorRole] = useState(defaults.defaultContributorRole);
  const [congregation, setCongregation] = useState(effectiveCongregationInfo.congregation);
  const [matriculaInput, setMatriculaInput] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");
  const [selectedMemberOriginCong, setSelectedMemberOriginCong] = useState("");
  const [contributorName, setContributorName] = useState("");
  const [contributorMatricula, setContributorMatricula] = useState<number | undefined>();
  const [notes, setNotes] = useState("");
  const [amount, setAmount] = useState("");
  const [printMiniReceipt, setPrintMiniReceipt] = useState(defaults.autoOpenReceiptOnSave);
  const [paperWidthOverride, setPaperWidthOverride] = useState<"58mm" | "80mm">(
    defaults.receiptPaperWidth
  );
  const [attachedPix, setAttachedPix] = useState<{ fileName: string; e2e?: string } | null>(null);
  const [extractingPix, setExtractingPix] = useState(false);

  // Member search dialog
  const [memberPickerOpen, setMemberPickerOpen] = useState(false);
  const [memberPickerQuery, setMemberPickerQuery] = useState("");
  const matriculaInputRef = useRef<HTMLInputElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  const pixAttachmentRef = useRef<HTMLInputElement | null>(null);

  // Receipt modal
  const [receiptEntry, setReceiptEntry] = useState<ThermalReceiptEntry | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // Filters for Conferência / Movimentações & Relatórios
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
  const defaultsSig = `${JSON.stringify(defaults)}|${effectiveCongregationInfo.congregation}`;

  useEffect(() => {
    if (lastDefaultsSigRef.current === defaultsSig) return;
    lastDefaultsSigRef.current = defaultsSig;
    setDefaultsDraft(defaults);
    setBankAccount(defaults.defaultBankAccount);
    setDepartment(defaults.defaultDepartment);
    setDocumentType(defaults.defaultDocumentType);
    setPaymentMethod(defaults.defaultPaymentMethod);
    setContributorRole(defaults.defaultContributorRole);
    setCongregation(effectiveCongregationInfo.congregation);
    setPrintMiniReceipt(defaults.autoOpenReceiptOnSave);
    setPaperWidthOverride(defaults.receiptPaperWidth);
    setPurpose(
      type === "entrada" ? defaults.defaultPurpose : defaults.defaultExpenseCategory
    );
  }, [defaultsSig, defaults, type, effectiveCongregationInfo.congregation]);

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

  const applyFoundMember = (found: MemberLookup) => {
    setSelectedMemberId(found.id);
    setContributorName(found.name);
    setContributorMatricula(found.matricula);
    setMatriculaInput(found.matricula ? String(found.matricula) : "");
    setSelectedMemberOriginCong(found.congregation || "");
    if (
      effectiveCongregationInfo.source !== "usuario" &&
      found.congregation
    ) {
      setCongregation(found.congregation);
    }
    if (
      found.role &&
      catalogs.contributorRoles.some(
        (r) => r.toLowerCase() === found.role.toLowerCase()
      )
    ) {
      setContributorRole(found.role);
    } else if (found.role) {
      setContributorRole(found.role);
    }
    if (type === "entrada") {
      const suggested = suggestAccountPlanForRole(
        found.role,
        purpose,
        catalogs.entryPurposes
      );
      if (suggested) setPurpose(suggested);
    }
  };

  const handleMemberSelect = (memberId: string) => {
    if (memberId === "__manual__") {
      setSelectedMemberId("");
      setContributorMatricula(undefined);
      setMatriculaInput("");
      setSelectedMemberOriginCong("");
      return;
    }
    const found = memberDirectory.find((m) => m.id === memberId);
    if (!found) return;
    applyFoundMember(found);
  };

  const handleMatriculaLookup = (moveFocusToAmount = false): boolean => {
    const clean = matriculaInput.trim();
    if (!clean) return false;
    const found = findMemberByMatriculaInput(memberDirectory, clean);
    if (!found) {
      toast({
        variant: "destructive",
        title: `Matrícula #${clean.replace(/#/g, "")} não encontrada`,
        description:
          memberDirectory.length === 0
            ? "Cadastre membros na Secretaria ou digite o nome manualmente."
            : "Verifique o número ou use a lupa para pesquisar pelo nome.",
      });
      return false;
    }
    applyFoundMember(found);
    if (moveFocusToAmount) {
      setTimeout(() => amountInputRef.current?.focus(), 20);
    }
    return true;
  };

  const handleAttachPixReceipt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    setExtractingPix(true);
    try {
      const [{ extractReceiptTextFromFile }, { parsePixReceiptText }] = await Promise.all([
        import("@/platform/labs/clientReceiptExtractor"),
        import("@/platform/labs/pixReceiptParser"),
      ]);
      const extracted = await extractReceiptTextFromFile(file);
      if (!extracted.text.trim()) {
        setAttachedPix({ fileName: file.name });
        toast({
          title: `Anexo ${file.name} referenciado (Zero Storage)`,
          description: "Não foi possível ler o valor automaticamente; preencha o valor ao lado.",
        });
        return;
      }
      const parsed = parsePixReceiptText(extracted.text, {
        churchName: defaults.churchHeader.churchName || clientName,
        churchCnpj: defaults.churchHeader.cnpj || "",
        pixKey: "",
        pixKeyType: "cnpj",
        bankName: bankAccount,
      });
      if (parsed.amount !== null) setAmount(parsed.amount.toFixed(2));
      if (parsed.paidAtIso && /^\d{4}-\d{2}-\d{2}/.test(parsed.paidAtIso)) {
        handleDateChange(parsed.paidAtIso.slice(0, 10));
      }
      if (parsed.e2eCode) {
        setNotes((prev) =>
          prev.trim()
            ? `${prev.trim()} • PIX ${parsed.e2eCode}`
            : `Comprovante PIX ${parsed.e2eCode}`
        );
      }
      if (!contributorName.trim() && parsed.payerName) {
        setContributorName(parsed.payerName);
      }
      if (catalogs.paymentMethods.includes("PIX")) setPaymentMethod("PIX");
      if (catalogs.documentTypes.includes("Comprovante PIX")) {
        setDocumentType("Comprovante PIX");
      }
      setAttachedPix({ fileName: file.name, e2e: parsed.e2eCode ?? undefined });
      toast({
        title: `Comprovante PIX lido localmente (${file.name})`,
        description:
          parsed.amount !== null
            ? `Valor R$ ${parsed.amount.toFixed(2)} identificado sem salvar arquivo no servidor.`
            : "Nenhum arquivo pesado enviado ao banco (Zero Storage).",
      });
    } catch {
      toast({
        variant: "destructive",
        title: "Não foi possível ler este anexo automaticamente",
      });
    } finally {
      setExtractingPix(false);
      inputEl.value = "";
    }
  };

  const resetPersonFieldsOnly = () => {
    setMatriculaInput("");
    setSelectedMemberId("");
    setSelectedMemberOriginCong("");
    setContributorName("");
    setContributorMatricula(undefined);
    setContributorRole(defaults.defaultContributorRole);
    setNotes("");
    setAmount("");
    setAttachedPix(null);
    setManualMonthEdited(false);
    if (defaults.autoReferenceMonthFromDate && /^\d{4}-\d{2}/.test(entryDate)) {
      setReferenceMonth(entryDate.slice(0, 7));
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
    const finalContributor =
      contributorName.trim() || (type === "entrada" ? "Oferta / Anônimo" : "Fornecedor");
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
      department,
      documentType,
      bankAccount,
      paymentMethod,
      contributorName: finalContributor,
      contributorMemberId: selectedMemberId || undefined,
      contributorMatricula,
      contributorRole,
      pixE2E: attachedPix?.e2e,
      attachmentName: attachedPix?.fileName,
      description: `${purpose} — ${finalContributor}`,
      notes: notes.trim() || undefined,
      congregation: congregation || effectiveCongregationInfo.congregation || "Igreja Sede",
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

    if (printMiniReceipt) {
      setReceiptEntry(toThermalEntry(nextEntry));
      setReceiptOpen(true);
    } else {
      toast({
        title: `Lançamento ${receiptNumber} salvo (${brl(numeric)})`,
        description: "Pronto para o próximo registro.",
      });
    }

    resetPersonFieldsOnly();
    setTimeout(() => matriculaInputRef.current?.focus(), 60);
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

  const reportSummary = useMemo(
    () => computeTreasuryReports(filteredEntries),
    [filteredEntries]
  );

  const memberPickerResults = useMemo(() => {
    const q = memberPickerQuery.trim().toLowerCase();
    if (!q) return memberDirectory.slice(0, 40);
    return memberDirectory
      .filter((m) => {
        const matStr = m.matricula ? `#${m.matricula} ${m.matricula}` : "";
        return (
          matStr.includes(q) ||
          m.name.toLowerCase().includes(q) ||
          m.role.toLowerCase().includes(q) ||
          m.congregation.toLowerCase().includes(q)
        );
      })
      .slice(0, 40);
  }, [memberDirectory, memberPickerQuery]);

  const handlePrintClosingReport = () => {
    const periodLabel =
      filterStartDate || filterEndDate
        ? `${filterStartDate || "..."} até ${filterEndDate || "..."}`
        : filterRefMonth !== "all"
        ? formatReferenceMonthLabel(filterRefMonth)
        : "Todo o período filtrado";
    const html = buildTreasuryClosingReportHtml({
      churchName: defaults.churchHeader.churchName || clientName,
      subtitle: defaults.churchHeader.subtitle,
      cnpj: defaults.churchHeader.cnpj,
      periodLabel,
      congregationLabel:
        effectiveCongregationInfo.source === "usuario"
          ? effectiveCongregationInfo.congregation
          : "Todas / Consolidado",
      generatedBy: currentOperator.name,
      summary: reportSummary,
    });
    const popup = window.open("", "_blank", "width=900,height=780");
    if (popup) {
      popup.document.open();
      popup.document.write(html);
      popup.document.close();
      popup.focus();
      setTimeout(() => popup.print(), 250);
    } else {
      window.print();
    }
  };

  const handleExportCsv = () => {
    const csv = buildTreasuryCsv(filteredEntries);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tesouraria-${todayStr}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast({ title: `Exportados ${filteredEntries.length} lançamento(s) em CSV!` });
  };

  const nextSeqLabel = `REC-${String(data.nextReceiptSeq).padStart(4, "0")}`;

  const renderQuickForm = () => (
    <Card className="border-primary/25">
      <CardHeader className="pb-3 flex flex-wrap flex-row items-center justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">
              Lançamento Simplificado
            </CardTitle>
            <Badge
              variant={effectiveCongregationInfo.source === "usuario" ? "default" : "secondary"}
              className="text-[11px]"
            >
              {effectiveCongregationInfo.source === "usuario"
                ? `Unidade do login: ${effectiveCongregationInfo.congregation}`
                : `Padrão: ${effectiveCongregationInfo.congregation}`}
            </Badge>
          </div>
          <CardDescription>
            Configurações cadastrais pré-preenchidas e busca instantânea por matrícula no balcão. Operador:{" "}
            <strong>{currentOperator.name}</strong> ({currentOperator.email}).
          </CardDescription>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
            <SelectTrigger className="h-8 w-44 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entrada">Entrada (Dízimo / Oferta)</SelectItem>
              <SelectItem value="saida">Saída / Despesa</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChangeSection?.("predefinicoes")}
            >
              <Settings2 className="h-3.5 w-3.5 mr-1.5" /> Configurar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleAdd} className="space-y-4">
          {/* Bloco 1: Configurações Cadastrais (Espelhado no Membros Web) */}
          <div className="rounded-lg border bg-muted/25 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Configurações Cadastrais
              </span>
              <span className="text-[11px] text-muted-foreground">
                Clique no ícone de engrenagem ao lado de cada caixa para adicionar/editar opções
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Igreja / Congregação *</Label>
                <EditableSelect
                  label="Igreja / Congregação"
                  value={congregation}
                  onChange={setCongregation}
                  options={congregationOptions}
                  onChangeOptions={(opts) => updateCatalog("congregations", opts)}
                  canManageOptions={canManageCatalogs}
                />
              </div>

              <div className="space-y-1">
                <Label>Conta Corrente *</Label>
                <EditableSelect
                  label="Conta Corrente"
                  value={bankAccount}
                  onChange={setBankAccount}
                  options={catalogs.bankAccounts}
                  onChangeOptions={(opts) => updateCatalog("bankAccounts", opts)}
                  canManageOptions={canManageCatalogs}
                />
              </div>

              <div className="space-y-1">
                <Label>Departamento *</Label>
                <EditableSelect
                  label="Departamento"
                  value={department}
                  onChange={setDepartment}
                  options={catalogs.departments}
                  onChangeOptions={(opts) => updateCatalog("departments", opts)}
                  canManageOptions={canManageCatalogs}
                />
              </div>

              <div className="space-y-1">
                <Label>Tipo de Documento</Label>
                <EditableSelect
                  label="Tipo de Documento"
                  value={documentType}
                  onChange={setDocumentType}
                  options={catalogs.documentTypes}
                  onChangeOptions={(opts) => updateCatalog("documentTypes", opts)}
                  canManageOptions={canManageCatalogs}
                />
              </div>

              <div className="space-y-1">
                <Label>
                  {type === "entrada" ? "Plano de Contas *" : "Categoria de Despesa *"}
                </Label>
                <EditableSelect
                  label={type === "entrada" ? "Plano de Contas" : "Categoria de Despesa"}
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
                <Label>Espécie (Forma de Pagamento) *</Label>
                <EditableSelect
                  label="Espécie"
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={catalogs.paymentMethods}
                  onChangeOptions={(opts) => updateCatalog("paymentMethods", opts)}
                  canManageOptions={canManageCatalogs}
                />
              </div>
            </div>
          </div>

          {/* Bloco 2: Dados do Recebimento (Matrícula + Busca rápida + Valor + Ref) */}
          <div className="rounded-lg border p-3.5 space-y-3 bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dados do Recebimento
              </span>
              {selectedMemberOriginCong && selectedMemberOriginCong !== congregation && (
                <button
                  type="button"
                  onClick={() => setCongregation(selectedMemberOriginCong)}
                  className="text-[11px] text-amber-700 hover:underline"
                  title="Clique para usar a congregação de origem cadastrada para este membro"
                >
                  Cadastro do membro: {selectedMemberOriginCong} (trocar?)
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-start">
              <div className="space-y-1 md:col-span-3">
                <Label htmlFor="tr-date">Data *</Label>
                <Input
                  id="tr-date"
                  type="date"
                  value={entryDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1 md:col-span-3">
                <Label htmlFor="tr-ref-month">Ref (mm/aaaa) *</Label>
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

              <div className="space-y-1 md:col-span-3">
                <Label htmlFor="tr-amount">Valor (R$) *</Label>
                <Input
                  ref={amountInputRef}
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

              <div className="space-y-1 md:col-span-3">
                <Label>Nº Lançamento</Label>
                <Input value={nextSeqLabel} readOnly className="font-mono bg-muted/40" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="space-y-1 md:col-span-3">
                <Label htmlFor="tr-matricula">Matrícula (Tab / Enter)</Label>
                <div className="flex gap-1.5">
                  <Input
                    ref={matriculaInputRef}
                    id="tr-matricula"
                    placeholder="Ex: 3686"
                    value={matriculaInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMatriculaInput(val);
                      const exact = findMemberByMatriculaInput(memberDirectory, val);
                      if (exact) {
                        applyFoundMember(exact);
                      } else {
                        setSelectedMemberId("");
                        setContributorMatricula(undefined);
                        setSelectedMemberOriginCong("");
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleMatriculaLookup(true);
                      }
                    }}
                    onBlur={() => {
                      if (matriculaInput.trim() && !selectedMemberId) {
                        handleMatriculaLookup(false);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="shrink-0"
                    title="Pesquisar membro no Rol da Secretaria"
                    onClick={() => {
                      setMemberPickerQuery("");
                      setMemberPickerOpen(true);
                    }}
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-1 md:col-span-3">
                <Label>Cargo / Condição</Label>
                <EditableSelect
                  label="Condição do Contribuinte"
                  value={contributorRole}
                  onChange={setContributorRole}
                  options={catalogs.contributorRoles}
                  onChangeOptions={(opts) => updateCatalog("contributorRoles", opts)}
                  canManageOptions={canManageCatalogs}
                />
              </div>

              <div className="space-y-1 md:col-span-6">
                <Label htmlFor="tr-contributor">
                  {type === "entrada"
                    ? "Nome da Pessoa (Dizimista / Ofertante) *"
                    : "Favorecido / Descrição *"}
                </Label>
                <Input
                  id="tr-contributor"
                  placeholder={
                    type === "entrada"
                      ? "Nome completo ou digite a matrícula ao lado"
                      : "Ex.: Conta de energia / Fornecedor"
                  }
                  value={contributorName}
                  onChange={(e) => {
                    setSelectedMemberId("");
                    setContributorMatricula(undefined);
                    setSelectedMemberOriginCong("");
                    setContributorName(e.target.value);
                  }}
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tr-notes">Histórico / Observações</Label>
              <Input
                id="tr-notes"
                placeholder="Ex.: Culto da noite / Referente ao mês anterior..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Rodapé do Lançamento Simplificado: Mini Recibo + Anexo + Imprimir Recibo */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                  <Checkbox
                    checked={printMiniReceipt}
                    onCheckedChange={(v) => setPrintMiniReceipt(Boolean(v))}
                  />
                  <span>Mini Recibo</span>
                </label>

                <Select
                  value={paperWidthOverride}
                  onValueChange={(v: "58mm" | "80mm") => setPaperWidthOverride(v)}
                >
                  <SelectTrigger className="h-8 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="80mm">80mm</SelectItem>
                    <SelectItem value="58mm">58mm</SelectItem>
                  </SelectContent>
                </Select>

                <input
                  ref={pixAttachmentRef}
                  type="file"
                  accept=".pdf,.txt,image/*"
                  onChange={handleAttachPixReceipt}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={extractingPix}
                  onClick={() => pixAttachmentRef.current?.click()}
                  title="Lê comprovante PIX (PDF ou print) direto no navegador sem salvar arquivo"
                >
                  {extractingPix ? (
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  ) : (
                    <Paperclip className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  {extractingPix ? "Lendo PIX..." : "Anexo / Ler PIX"}
                </Button>

                {attachedPix && (
                  <Badge variant="outline" className="text-[11px] gap-1 pr-1">
                    {attachedPix.fileName}
                    <button
                      type="button"
                      onClick={() => setAttachedPix(null)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={resetPersonFieldsOnly}
                  title="Limpar apenas dados da pessoa e valor"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
                <Button type="submit">
                  {printMiniReceipt ? (
                    <>
                      <Printer className="h-4 w-4 mr-1.5" /> Imprimir Recibo
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1.5" /> Salvar Lançamento
                    </>
                  )}
                </Button>
              </div>
            </div>
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
            <TabsTrigger value="relatorios">Relatórios &amp; Caixa</TabsTrigger>
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

        <TabsContent value="relatorios" className="space-y-5">
          <Card>
            <CardHeader className="flex flex-wrap flex-row items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4 text-primary" /> Relatórios, Balancete Analítico &amp; Encerramento do Caixa
                </CardTitle>
                <CardDescription>
                  Reflete automaticamente os filtros de período, conta, plano e operador selecionados ({filteredEntries.length} movimento(s)).
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilterStartDate(todayStr);
                    setFilterEndDate(todayStr);
                  }}
                >
                  Caixa de Hoje
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={handleExportCsv}
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Exportar CSV
                </Button>
                <Button type="button" size="sm" onClick={handlePrintClosingReport}>
                  <Printer className="h-3.5 w-3.5 mr-1.5" /> Imprimir Encerramento do Caixa
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-3 bg-emerald-500/5">
                <div className="text-xs text-muted-foreground">Total Entradas no Recorte</div>
                <div className="text-2xl font-bold text-emerald-700">
                  {brl(reportSummary.totalIncome)}
                </div>
              </div>
              <div className="rounded-lg border p-3 bg-rose-500/5">
                <div className="text-xs text-muted-foreground">Total Saídas no Recorte</div>
                <div className="text-2xl font-bold text-rose-700">
                  {brl(reportSummary.totalExpense)}
                </div>
              </div>
              <div className="rounded-lg border p-3 bg-primary/5">
                <div className="text-xs text-muted-foreground">Saldo Líquido (Encerramento)</div>
                <div className="text-2xl font-bold text-primary">
                  {brl(reportSummary.netBalance)}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Balancete Analítico (Plano de Contas)</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plano de Contas</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Saídas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportSummary.byAccountPlan.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-xs text-muted-foreground py-6">
                          Sem lançamentos para exibir.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportSummary.byAccountPlan.map((row) => (
                        <TableRow key={row.label}>
                          <TableCell className="text-xs font-medium">{row.label}</TableCell>
                          <TableCell className="text-right text-xs font-mono">{row.count}</TableCell>
                          <TableCell className="text-right text-xs text-emerald-700 font-semibold">
                            {brl(row.income)}
                          </TableCell>
                          <TableCell className="text-right text-xs text-rose-600 font-semibold">
                            {brl(row.expense)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Fechamento por Espécie &amp; Congregação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Espécie (Meio)</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Saídas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportSummary.byPaymentMethod.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell className="text-xs font-medium">{row.label}</TableCell>
                        <TableCell className="text-right text-xs text-emerald-700">{brl(row.income)}</TableCell>
                        <TableCell className="text-right text-xs text-rose-600">{brl(row.expense)}</TableCell>
                        <TableCell className="text-right text-xs font-bold">{brl(row.net)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Congregação / Repasse</TableHead>
                      <TableHead className="text-right">Entradas</TableHead>
                      <TableHead className="text-right">Saídas</TableHead>
                      <TableHead className="text-right">Saldo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportSummary.byCongregation.map((row) => (
                      <TableRow key={row.label}>
                        <TableCell className="text-xs font-medium">{row.label}</TableCell>
                        <TableCell className="text-right text-xs text-emerald-700">{brl(row.income)}</TableCell>
                        <TableCell className="text-right text-xs text-rose-600">{brl(row.expense)}</TableCell>
                        <TableCell className="text-right text-xs font-bold">{brl(row.net)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
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
                      <Label>Congregação padrão (quando usuário não tem vínculo fixo)</Label>
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
                      <Label>Departamento padrão</Label>
                      <EditableSelect
                        label="Departamento"
                        value={defaultsDraft.defaultDepartment}
                        onChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, defaultDepartment: v })
                        }
                        options={catalogs.departments}
                        onChangeOptions={(opts) => updateCatalog("departments", opts)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Tipo de Documento padrão</Label>
                      <EditableSelect
                        label="Tipo de Documento"
                        value={defaultsDraft.defaultDocumentType}
                        onChange={(v) =>
                          setDefaultsDraft({ ...defaultsDraft, defaultDocumentType: v })
                        }
                        options={catalogs.documentTypes}
                        onChangeOptions={(opts) => updateCatalog("documentTypes", opts)}
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
        paperWidth={paperWidthOverride}
      />

      {/* Modal: Busca rápida de membro no Rol da Secretaria */}
      <Dialog open={memberPickerOpen} onOpenChange={setMemberPickerOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Selecionar Membro / Contribuinte</DialogTitle>
            <DialogDescription>
              Pesquise por número de matrícula, nome, cargo ou congregação para preencher instantaneamente no Lançamento Simplificado.
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              autoFocus
              className="pl-8"
              placeholder="Digite matrícula ou parte do nome..."
              value={memberPickerQuery}
              onChange={(e) => setMemberPickerQuery(e.target.value)}
            />
          </div>
          <div className="overflow-y-auto space-y-1.5 max-h-80 pr-1">
            {memberPickerResults.length === 0 ? (
              <p className="text-xs text-muted-foreground py-8 text-center">
                {memberDirectory.length === 0
                  ? "Nenhum membro cadastrado na Secretaria para este contrato."
                  : "Nenhum membro encontrado com este termo."}
              </p>
            ) : (
              memberPickerResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    applyFoundMember(m);
                    setMemberPickerOpen(false);
                    setTimeout(() => amountInputRef.current?.focus(), 40);
                  }}
                  className="w-full rounded-lg border px-3 py-2 text-left hover:border-primary hover:bg-primary/5 flex items-center justify-between gap-2 text-xs transition-colors"
                >
                  <div>
                    <div className="font-semibold text-sm">{m.name}</div>
                    <div className="text-muted-foreground">
                      {m.role} • {m.congregation}
                    </div>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    #{m.matricula ?? "-"}
                  </Badge>
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
