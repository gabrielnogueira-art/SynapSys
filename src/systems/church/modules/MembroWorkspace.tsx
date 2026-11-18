import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileCheck2,
  Landmark,
  Loader2,
  Printer,
  QrCode,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  Upload,
  UserCheck,
} from "lucide-react";
import type {
  DigitalTitheRecord,
  LabRoleMode,
  MembroPortalData,
} from "@/platform/labs/labsTypes";
import {
  buildMemberAnnualTimeline,
  nextTitheReceiptNumber,
} from "@/platform/labs/labsDefaults";
import {
  buildPrintableTitheReceiptHtml,
  buildTitheReceiptShareText,
  parsePixReceiptText,
  SAMPLE_PIX_PRESETS,
} from "@/platform/labs/pixReceiptParser";
import {
  currentCompetence,
  formatBRL,
  formatCompetenceLabel,
  roundCurrency,
  todayIsoDate,
} from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";

interface MembroWorkspaceProps {
  data: MembroPortalData;
  onChange: (next: MembroPortalData) => void;
  roleMode?: LabRoleMode;
  isSandbox?: boolean;
}

export const MembroWorkspace = ({
  data,
  onChange,
  roleMode = "admin",
  isSandbox = false,
}: MembroWorkspaceProps) => {
  const { toast } = useToast();
  const isAdmin = roleMode === "admin";
  const canReconcile = roleMode === "admin" || roleMode === "operador";

  const [viewMode, setViewMode] = useState<"membro" | "tesouraria" | "config">(
    roleMode === "operador" ? "tesouraria" : "membro"
  );

  // If role becomes voluntario (pure member simulation), lock to member view
  useEffect(() => {
    if (!canReconcile && viewMode !== "membro") {
      setViewMode("membro");
    }
  }, [canReconcile, viewMode]);

  const activeMember = useMemo(
    () =>
      data.members.find((m) => m.id === data.activeMemberId) ?? data.members[0] ?? null,
    [data.members, data.activeMemberId]
  );

  const [timelineYear, setTimelineYear] = useState<number>(() =>
    new Date().getFullYear()
  );

  // PIX receipt intake & OCR simulation (Zero File Storage: in-memory only)
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const deliverCardRef = useRef<HTMLDivElement | null>(null);
  const [rawReceiptText, setRawReceiptText] = useState<string>("");
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractingFile, setExtractingFile] = useState(false);
  const [extractProgress, setExtractProgress] = useState("");
  const [competenceMonth, setCompetenceMonth] = useState<string>(currentCompetence());
  const [manualUnlock, setManualUnlock] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState(() => `${todayIsoDate()} 12:00`);
  const [manualE2E, setManualE2E] = useState("");
  const [titheNotes, setTitheNotes] = useState("");

  // Dynamic receipt modal state (no stored files!)
  const [receiptModalTithe, setReceiptModalTithe] =
    useState<DigitalTitheRecord | null>(null);

  // Church PIX Config draft
  const [pixCfgDraft, setPixCfgDraft] = useState(data.churchPixConfig);
  useEffect(() => {
    setPixCfgDraft(data.churchPixConfig);
  }, [data.churchPixConfig]);

  // Clean up ephemeral in-memory preview URL
  useEffect(() => {
    return () => {
      if (localPreviewUrl) URL.revokeObjectURL(localPreviewUrl);
    };
  }, [localPreviewUrl]);

  const parsedReceipt = useMemo(
    () => parsePixReceiptText(rawReceiptText, data.churchPixConfig),
    [rawReceiptText, data.churchPixConfig]
  );

  // Sync auto-filled fields whenever parser reads or clears a receipt
  useEffect(() => {
    if (manualUnlock) return;
    if (!rawReceiptText.trim()) {
      setManualAmount("");
      setManualDate(`${todayIsoDate()} 12:00`);
      setManualE2E("");
      return;
    }
    setManualAmount(parsedReceipt.amount !== null ? parsedReceipt.amount.toFixed(2) : "");
    setManualDate(parsedReceipt.paidAtIso ?? `${todayIsoDate()} 12:00`);
    setManualE2E(parsedReceipt.e2eCode ?? "");
  }, [rawReceiptText, parsedReceipt, manualUnlock]);

  const timeline = useMemo(
    () =>
      activeMember
        ? buildMemberAnnualTimeline(data.tithes, activeMember.id, timelineYear)
        : [],
    [data.tithes, activeMember, timelineYear]
  );

  const treasuryMetrics = useMemo(() => {
    let reconciledTotal = 0;
    let pendingTotal = 0;
    let pendingCount = 0;
    let alertsCount = 0;
    for (const t of data.tithes) {
      if (t.status === "conciliado") {
        reconciledTotal = roundCurrency(reconciledTotal + t.amount);
      } else {
        pendingCount += 1;
        pendingTotal = roundCurrency(pendingTotal + t.amount);
      }
      if (!t.verifiedRecipient) alertsCount += 1;
    }
    return { reconciledTotal, pendingTotal, pendingCount, alertsCount };
  }, [data.tithes]);

  const handleFilePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setManualUnlock(false);
    setRawReceiptText("");
    setManualAmount("");
    setManualE2E("");

    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }

    if (file.type.startsWith("image/")) {
      const objUrl = URL.createObjectURL(file);
      setLocalPreviewUrl(objUrl);
    }

    setExtractingFile(true);
    setExtractProgress(`Lendo ${file.name} localmente (Zero Storage)...`);
    try {
      const { extractReceiptTextFromFile } = await import(
        "@/platform/labs/clientReceiptExtractor"
      );
      const result = await extractReceiptTextFromFile(file, setExtractProgress);
      if (result.text.trim()) {
        setRawReceiptText(result.text.slice(0, 6000));
        const methodLabel =
          result.method === "pdf-text"
            ? "PDF decodificado localmente"
            : result.method === "pdf-ocr"
            ? "PDF lido via OCR local"
            : result.method === "image-ocr"
            ? "Imagem lida via OCR local"
            : "Arquivo texto lido localmente";
        toast({
          title: `${methodLabel} (${file.name})`,
          description: "Nenhum arquivo foi enviado ao servidor.",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Não foi possível extrair texto automático desse arquivo",
          description:
            "Cole o texto do comprovante abaixo ou clique em 'Editar manualmente' ao lado.",
        });
      }
    } catch (err: unknown) {
      toast({
        variant: "destructive",
        title: "Falha ao ler comprovante no navegador",
        description:
          err instanceof Error
            ? err.message
            : "Cole o texto do comprovante manualmente ou tente outro formato.",
      });
    } finally {
      setExtractingFile(false);
      setExtractProgress("");
      inputEl.value = "";
    }
  };

  const applySamplePreset = (presetId: string) => {
    const preset = SAMPLE_PIX_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    setUploadedFileName(null);
    setManualUnlock(false);
    setRawReceiptText(preset.rawText);
    toast({ title: `Comprovante simulado carregado: ${preset.bank}` });
  };

  const handleConfirmTithe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMember) return;
    const amountNum = parseFloat(manualAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast({ variant: "destructive", title: "Informe ou leia um valor válido de dízimo." });
      return;
    }
    const e2e = manualE2E.trim() || `MANUAL-${Date.now()}`;
    const newRecord: DigitalTitheRecord = {
      id: `dz-${Date.now()}`,
      receiptNumber: nextTitheReceiptNumber(data.tithes),
      memberId: activeMember.id,
      matricula: activeMember.matricula,
      memberName: activeMember.fullName,
      memberRole: activeMember.ecclesiasticalRole,
      congregation: activeMember.congregation,
      competenceMonth,
      amount: roundCurrency(amountNum),
      paidAtIso: manualDate.trim() || `${todayIsoDate()} 12:00`,
      paymentMethod: "PIX",
      e2eCode: e2e,
      bankOrigin: parsedReceipt.bankOrigin ?? undefined,
      verifiedRecipient: parsedReceipt.verificationStatus === "verificado",
      recipientWarning:
        parsedReceipt.verificationStatus !== "verificado"
          ? parsedReceipt.verificationMessage
          : undefined,
      status: "aguardando_conferencia",
      notes: titheNotes.trim() || undefined,
      createdAt: todayIsoDate(),
    };

    onChange({
      ...data,
      tithes: [newRecord, ...data.tithes],
    });

    // Clear temporary in-memory receipt file/text ("Zero File Storage")
    if (localPreviewUrl) {
      URL.revokeObjectURL(localPreviewUrl);
      setLocalPreviewUrl(null);
    }
    setUploadedFileName(null);
    setRawReceiptText("");
    setManualAmount("");
    setManualE2E("");
    setTitheNotes("");
    setManualUnlock(false);

    setReceiptModalTithe(newRecord);
    toast({
      title: `Dízimo registrado (${formatBRL(newRecord.amount)})!`,
      description: `Metadados salvos sem armazenar arquivos. Recibo ${newRecord.receiptNumber} pronto.`,
    });
  };

  const handleReconcileTithe = (titheId: string) => {
    onChange({
      ...data,
      tithes: data.tithes.map((t) =>
        t.id === titheId
          ? {
              ...t,
              status: "conciliado",
              reconciledBy: isAdmin ? "Administrador / Tesouraria" : "Tesoureiro Plantão",
              reconciledAt: todayIsoDate(),
            }
          : t
      ),
    });
    toast({ title: "Dízimo conciliado com o extrato e refletido no livro-caixa!" });
  };

  const handlePrintReceipt = (tithe: DigitalTitheRecord) => {
    const member = data.members.find((m) => m.id === tithe.memberId);
    const html = buildPrintableTitheReceiptHtml(
      tithe,
      data.churchPixConfig,
      member?.ebdClassName
    );
    const win = window.open("", "_blank", "width=720,height=760");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => win.print(), 300);
      return;
    }
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc && iframe.contentWindow) {
      doc.open();
      doc.write(html);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => document.body.removeChild(iframe), 1500);
      }, 300);
    } else {
      document.body.removeChild(iframe);
    }
  };

  const handleShareWhatsapp = (tithe: DigitalTitheRecord) => {
    const text = buildTitheReceiptShareText(tithe, data.churchPixConfig);
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const handleCopyReceiptText = async (tithe: DigitalTitheRecord) => {
    const text = buildTitheReceiptShareText(tithe, data.churchPixConfig);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Texto do recibo copiado!" });
    } catch {
      toast({ variant: "destructive", title: "Não foi possível copiar" });
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho & Troca de Perfil / Visão */}
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-base">
                Portal do Membro &amp; Dízimos Digitais
              </h3>
              {isSandbox && <Badge variant="secondary">Sandbox Labs</Badge>}
              <Badge variant="outline" className="text-[10px]">
                Zero File Storage
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Carteirinha integrada (Secretaria + EBD), leitura de comprovante PIX e recibo dinâmico sob demanda.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data.members.length > 0 && (
            <Select
              value={activeMember?.id ?? ""}
              onValueChange={(id) => onChange({ ...data, activeMemberId: id })}
            >
              <SelectTrigger className="w-64 h-9 text-xs">
                <SelectValue placeholder="Membro simulado" />
              </SelectTrigger>
              <SelectContent>
                {data.members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    #{m.matricula} — {m.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex rounded-lg border bg-muted/40 p-0.5">
            <Button
              type="button"
              size="sm"
              variant={viewMode === "membro" ? "default" : "ghost"}
              className="h-8 text-xs"
              onClick={() => setViewMode("membro")}
            >
              Área do Membro
            </Button>
            {canReconcile && (
              <Button
                type="button"
                size="sm"
                variant={viewMode === "tesouraria" ? "default" : "ghost"}
                className="h-8 text-xs"
                onClick={() => setViewMode("tesouraria")}
              >
                Tesouraria ({treasuryMetrics.pendingCount})
              </Button>
            )}
            {isAdmin && (
              <Button
                type="button"
                size="sm"
                variant={viewMode === "config" ? "default" : "ghost"}
                className="h-8 text-xs"
                onClick={() => setViewMode("config")}
              >
                <Settings2 className="h-3.5 w-3.5 mr-1" /> PIX Igreja
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* =======================================================
          VISÃO 1: PORTAL DO MEMBRO (SELF-SERVICE)
          ======================================================= */}
      {viewMode === "membro" && activeMember && (
        <div className="space-y-6">
          {/* A. Carteirinha Digital + Integração Secretaria & EBD */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <Card className="lg:col-span-7">
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-full bg-primary/15 border border-primary/40 flex items-center justify-center font-bold text-lg text-primary shrink-0">
                      {activeMember.fullName
                        .split(" ")
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">{activeMember.fullName}</CardTitle>
                        <Badge className="font-mono">Matrícula #{activeMember.matricula}</Badge>
                      </div>
                      <CardDescription>
                        {activeMember.ecclesiasticalRole} • {activeMember.congregation}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                    Membro Ativo
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs pt-1">
                <div className="rounded-lg border p-2.5">
                  <span className="text-muted-foreground block text-[11px]">CPF (Secretaria)</span>
                  <strong>{activeMember.cpfMasked}</strong>
                </div>
                <div className="rounded-lg border p-2.5">
                  <span className="text-muted-foreground block text-[11px]">Nascimento</span>
                  <strong>{activeMember.birthDate.split("-").reverse().join("/")}</strong>
                </div>
                <div className="rounded-lg border p-2.5">
                  <span className="text-muted-foreground block text-[11px]">Batismo</span>
                  <strong>
                    {activeMember.baptismDate
                      ? activeMember.baptismDate.split("-").reverse().join("/")
                      : "Não informado"}
                  </strong>
                </div>
                <div className="rounded-lg border p-2.5 sm:col-span-2">
                  <span className="text-muted-foreground block text-[11px]">Endereço</span>
                  <strong>{activeMember.address}</strong>
                </div>
                <div className="rounded-lg border p-2.5">
                  <span className="text-muted-foreground block text-[11px]">Estado Civil</span>
                  <strong>
                    {activeMember.maritalStatus}
                    {activeMember.spouseName ? ` • ${activeMember.spouseName}` : ""}
                  </strong>
                </div>
              </CardContent>
            </Card>

            {/* Card Integrado EBD */}
            <Card className="lg:col-span-5 border-primary/30 bg-primary/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    Vínculo na Escola Bíblica (EBD)
                  </CardTitle>
                  <Badge variant="secondary" className="text-[10px]">
                    Secretaria ↔ EBD
                  </Badge>
                </div>
                <CardDescription>
                  Turma vinculada automaticamente ao cadastro e faixa etária do membro.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="text-muted-foreground text-[11px]">Classe Atual</div>
                  <div className="font-bold text-sm text-primary">
                    {activeMember.ebdClassName}
                  </div>
                </div>
                <div className="rounded-lg border bg-card p-3 space-y-1">
                  <div className="text-muted-foreground text-[11px]">Professores Responsáveis</div>
                  <div className="font-medium">{activeMember.ebdTeachers}</div>
                </div>
                <div className="rounded-lg border bg-card p-3 flex items-center justify-between gap-2">
                  <span>{activeMember.ebdAttendanceSummary}</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* B. Linha do Tempo Anual de Dízimos (12 meses) */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Minha Linha do Tempo de Dízimos ({timelineYear})
                  </CardTitle>
                  <CardDescription>
                    Acompanhe seus meses já devolvidos e emita o recibo dinâmico sem depender de arquivos guardados.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setTimelineYear((y) => y - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="font-mono font-bold text-sm px-2">{timelineYear}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-8 w-8"
                    onClick={() => setTimelineYear((y) => y + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {timeline.map((slot) => {
                  const isPaid = slot.status === "conciliado";
                  const isPending = slot.status === "aguardando_conferencia";
                  return (
                    <div
                      key={slot.competenceMonth}
                      className={`rounded-xl border p-3 flex flex-col justify-between gap-2 text-xs ${
                        isPaid
                          ? "border-emerald-500/40 bg-emerald-500/10"
                          : isPending
                          ? "border-amber-500/40 bg-amber-500/10"
                          : "border-border bg-muted/25"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm">
                          {slot.shortLabel}/{String(timelineYear).slice(2)}
                        </span>
                        {isPaid ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : isPending ? (
                          <Clock className="h-4 w-4 text-amber-500" />
                        ) : null}
                      </div>

                      {slot.tithe ? (
                        <>
                          <div>
                            <div className="font-bold text-sm text-foreground">
                              {formatBRL(slot.tithe.amount)}
                            </div>
                            <div className="text-[10px] text-muted-foreground">
                              {isPaid ? "Conciliado" : "Em conferência"}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] w-full bg-card"
                            onClick={() => setReceiptModalTithe(slot.tithe)}
                          >
                            Ver Recibo
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="text-[11px] text-muted-foreground">Em aberto</div>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 text-[11px] w-full text-primary"
                            onClick={() => {
                              setCompetenceMonth(slot.competenceMonth);
                              deliverCardRef.current?.scrollIntoView({
                                behavior: "smooth",
                                block: "start",
                              });
                            }}
                          >
                            Dizimar
                          </Button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* C. Fluxo de Devolução com Leitor Inteligente de Comprovante PIX */}
          <Card ref={deliverCardRef} className="border-primary/35">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <QrCode className="h-4 w-4 text-primary" />
                Entregar Dízimo via Comprovante PIX (Leitura Inteligente)
              </CardTitle>
              <CardDescription>
                Faça o PIX para a conta oficial da igreja abaixo e anexe/cole o comprovante. O sistema valida o favorecido, preenche valor e data automaticamente e grava somente os dados — zero arquivos PDF/imagens no servidor.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Passo 1: Dados PIX da Igreja */}
              <div className="rounded-xl border bg-muted/40 p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 text-xs">
                  <div className="font-semibold text-sm">{data.churchPixConfig.churchName}</div>
                  <div className="text-muted-foreground">
                    CNPJ: <strong>{data.churchPixConfig.churchCnpj || "Não configurado"}</strong> • Banco:{" "}
                    <strong>{data.churchPixConfig.bankName}</strong>
                  </div>
                  <div className="pt-1">
                    Chave PIX:{" "}
                    <code className="bg-background px-2 py-0.5 rounded border text-primary font-semibold">
                      {data.churchPixConfig.pixKey || "Configurar chave PIX"}
                    </code>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    if (!data.churchPixConfig.pixKey) return;
                    try {
                      await navigator.clipboard.writeText(data.churchPixConfig.pixKey);
                      toast({ title: "Chave PIX oficial da igreja copiada!" });
                    } catch {
                      toast({ variant: "destructive", title: "Não foi possível copiar" });
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5 mr-1.5" /> Copiar Chave PIX
                </Button>
              </div>

              {/* Passo 2 e 3 lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Coluna Leitura do Comprovante */}
                <div className="lg:col-span-6 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-xs font-semibold">
                      1. Subir Comprovante ou Simular Leitura Bancária
                    </Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.csv,.pdf,image/*"
                      onChange={handleFilePicked}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={extractingFile}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {extractingFile ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {extractingFile ? "Extraindo..." : "Selecionar Arquivo / Print"}
                    </Button>
                  </div>

                  {extractingFile && (
                    <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary flex items-center gap-2">
                      <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                      <span>{extractProgress || "Extraindo comprovante localmente..."}</span>
                    </div>
                  )}

                  {/* Simuladores de Bancos no Labs */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] text-muted-foreground">
                      Testar leitura automática com presets bancários:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {SAMPLE_PIX_PRESETS.map((preset) => (
                        <Button
                          key={preset.id}
                          type="button"
                          size="sm"
                          variant={preset.validTarget ? "secondary" : "outline"}
                          className="h-7 text-[11px]"
                          onClick={() => applySamplePreset(preset.id)}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {localPreviewUrl && (
                    <div className="rounded-lg border p-2.5 bg-muted/20 space-y-1.5">
                      <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                        <span>Prévia temporária local ({uploadedFileName}) — não salva no banco</span>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px]"
                          onClick={() => {
                            URL.revokeObjectURL(localPreviewUrl);
                            setLocalPreviewUrl(null);
                            setUploadedFileName(null);
                          }}
                        >
                          Limpar
                        </Button>
                      </div>
                      <img
                        src={localPreviewUrl}
                        alt="Prévia do comprovante local"
                        className="max-h-40 rounded object-contain mx-auto"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label className="text-xs">Conteúdo extraído / colado do comprovante PIX</Label>
                    <Textarea
                      rows={6}
                      className="text-xs font-mono"
                      placeholder="Cole aqui o texto copiado do comprovante PIX do seu banco ou clique em um banco acima para testar..."
                      value={rawReceiptText}
                      onChange={(e) => {
                        setManualUnlock(false);
                        setRawReceiptText(e.target.value);
                      }}
                    />
                  </div>

                  {rawReceiptText.trim() && (
                    <div
                      className={`rounded-lg border p-3 text-xs flex items-start gap-2 ${
                        parsedReceipt.verificationStatus === "verificado"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                          : parsedReceipt.verificationStatus === "divergente"
                          ? "border-destructive/40 bg-destructive/10 text-destructive"
                          : "border-amber-500/40 bg-amber-500/10 text-amber-400"
                      }`}
                    >
                      {parsedReceipt.verificationStatus === "verificado" ? (
                        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                      )}
                      <div className="space-y-1">
                        <div className="font-semibold">{parsedReceipt.verificationMessage}</div>
                        <div className="text-[11px] opacity-90">
                          Favorecido lido: {parsedReceipt.recipientName || "—"} • CNPJ:{" "}
                          {parsedReceipt.recipientCnpj || "—"} • Banco:{" "}
                          {parsedReceipt.bankOrigin || "—"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Coluna Confirmação do Dízimo */}
                <form
                  onSubmit={handleConfirmTithe}
                  className="lg:col-span-6 rounded-xl border bg-muted/20 p-4 space-y-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm">
                      2. Confirmar Devolução &amp; Gerar Recibo
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[11px]"
                      onClick={() => setManualUnlock((v) => !v)}
                    >
                      {manualUnlock ? "Travamento automático" : "Editar manualmente"}
                    </Button>
                  </div>

                  <div className="rounded-lg border bg-card p-3 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Dizimista</span>
                      <strong>{activeMember.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Matrícula / Cargo</span>
                      <strong>
                        #{activeMember.matricula} • {activeMember.ecclesiasticalRole}
                      </strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Valor Identificado (R$) *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        readOnly={Boolean(rawReceiptText.trim() && !manualUnlock && parsedReceipt.amount)}
                        value={manualAmount}
                        onChange={(e) => setManualAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Mês de Referência do Dízimo *</Label>
                      <Input
                        type="month"
                        value={competenceMonth}
                        onChange={(e) => setCompetenceMonth(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Data e Hora do Comprovante</Label>
                      <Input
                        readOnly={Boolean(rawReceiptText.trim() && !manualUnlock && parsedReceipt.paidAtIso)}
                        value={manualDate}
                        onChange={(e) => setManualDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Autenticação / ID E2E</Label>
                      <Input
                        readOnly={Boolean(rawReceiptText.trim() && !manualUnlock && parsedReceipt.e2eCode)}
                        value={manualE2E}
                        onChange={(e) => setManualE2E(e.target.value)}
                        placeholder="E18236120..."
                        className="font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Observação opcional</Label>
                    <Input
                      placeholder="Ex.: Dízimo referente às férias / 13º"
                      value={titheNotes}
                      onChange={(e) => setTitheNotes(e.target.value)}
                    />
                  </div>

                  <Button type="submit" className="w-full">
                    <FileCheck2 className="h-4 w-4 mr-1.5" />
                    Confirmar Devolução &amp; Visualizar Recibo
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =======================================================
          VISÃO 2: CONFERÊNCIA DA TESOURARIA (CRUZAMENTO)
          ======================================================= */}
      {viewMode === "tesouraria" && canReconcile && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Conciliado (Livro-Caixa)</CardDescription>
                <CardTitle className="text-2xl text-emerald-500">
                  {formatBRL(treasuryMetrics.reconciledTotal)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Aguardando Conferência no Extrato</CardDescription>
                <CardTitle className="text-2xl text-amber-500">
                  {formatBRL(treasuryMetrics.pendingTotal)}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {treasuryMetrics.pendingCount} lançamento(s) na fila
                </p>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Alertas de Favorecido / CNPJ</CardDescription>
                <CardTitle
                  className={`text-2xl ${
                    treasuryMetrics.alertsCount > 0 ? "text-destructive" : "text-foreground"
                  }`}
                >
                  {treasuryMetrics.alertsCount}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Comprovantes que exigem conferência rigorosa
                </p>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-4 w-4 text-primary" />
                Fila de Conferência PIX — Dízimos Digitais
              </CardTitle>
              <CardDescription>
                Cada registro contém apenas os metadados estruturados (zero armazenamento de arquivos) prontos para conciliação no livro-caixa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {data.tithes.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nenhum dízimo digital lançado ainda. Use a aba Área do Membro para simular um envio PIX.
                </p>
              ) : (
                data.tithes.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-lg border p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          #{t.matricula}
                        </Badge>
                        <strong className="text-sm">{t.memberName}</strong>
                        <Badge
                          variant={t.status === "conciliado" ? "default" : "secondary"}
                        >
                          {t.status === "conciliado" ? "Conciliado" : "Aguardando Conferência"}
                        </Badge>
                        {t.verifiedRecipient ? (
                          <Badge variant="outline" className="border-emerald-500/40 text-emerald-500">
                            PIX/CNPJ Igreja OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Conferir CNPJ/Favorecido
                          </Badge>
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        Ref.: <strong>{formatCompetenceLabel(t.competenceMonth)}</strong> • Valor:{" "}
                        <strong className="text-foreground">{formatBRL(t.amount)}</strong> •{" "}
                        {t.bankOrigin || "PIX"} • E2E: <code>{t.e2eCode}</code>
                      </div>
                      {t.recipientWarning && (
                        <div className="text-[11px] text-destructive">{t.recipientWarning}</div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setReceiptModalTithe(t)}
                      >
                        Ver Recibo
                      </Button>
                      {t.status !== "conciliado" && (
                        <Button size="sm" onClick={() => handleReconcileTithe(t.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Conciliar c/ Extrato
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =======================================================
          VISÃO 3: CONFIGURAÇÃO PIX OFICIAL DA IGREJA
          ======================================================= */}
      {viewMode === "config" && isAdmin && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              Dados Oficiais PIX da Igreja (para validação automática de comprovantes)
            </CardTitle>
            <CardDescription>
              O leitor compara o CNPJ e o favorecido do comprovante enviado pelo membro contra os dados abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label>Nome Oficial / Favorecido da Igreja</Label>
              <Input
                value={pixCfgDraft.churchName}
                onChange={(e) =>
                  setPixCfgDraft((c) => ({ ...c, churchName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>CNPJ Oficial da Igreja (usado na validação antifraude)</Label>
              <Input
                value={pixCfgDraft.churchCnpj}
                onChange={(e) =>
                  setPixCfgDraft((c) => ({ ...c, churchCnpj: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Chave PIX exibida ao Membro</Label>
              <Input
                value={pixCfgDraft.pixKey}
                onChange={(e) =>
                  setPixCfgDraft((c) => ({ ...c, pixKey: e.target.value }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label>Instituição / Banco</Label>
              <Input
                value={pixCfgDraft.bankName}
                onChange={(e) =>
                  setPixCfgDraft((c) => ({ ...c, bankName: e.target.value }))
                }
              />
            </div>
            <div className="md:col-span-2 pt-2">
              <Button
                onClick={() => {
                  onChange({ ...data, churchPixConfig: pixCfgDraft });
                  toast({ title: "Dados PIX da igreja atualizados!" });
                }}
              >
                Salvar Configuração PIX
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MODAL DINÂMICO DE RECIBO SOB DEMANDA (ZERO FILE STORAGE) */}
      <Dialog
        open={Boolean(receiptModalTithe)}
        onOpenChange={(v) => !v && setReceiptModalTithe(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileCheck2 className="h-5 w-5 text-primary" />
              Recibo Dinâmico de Dízimo ({receiptModalTithe?.receiptNumber})
            </DialogTitle>
            <DialogDescription>
              Gerado em tempo real a partir dos metadados — nenhum PDF fica guardado no servidor.
            </DialogDescription>
          </DialogHeader>

          {receiptModalTithe && (
            <div className="rounded-xl border bg-white text-slate-900 p-5 space-y-3 text-xs">
              <div className="flex justify-between items-start border-b border-slate-300 pb-2.5 gap-3">
                <div>
                  <div className="font-bold text-sm text-cyan-700">
                    {data.churchPixConfig.churchName}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    CNPJ: {data.churchPixConfig.churchCnpj || "—"} •{" "}
                    {receiptModalTithe.congregation}
                  </div>
                </div>
                <Badge
                  className={
                    receiptModalTithe.status === "conciliado"
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white"
                  }
                >
                  {receiptModalTithe.status === "conciliado"
                    ? "Conciliado"
                    : "Aguardando Extrato"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Dizimista</span>
                  <strong>{receiptModalTithe.memberName}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">
                    Matrícula / Cargo
                  </span>
                  <strong>
                    #{receiptModalTithe.matricula} • {receiptModalTithe.memberRole}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Referência</span>
                  <strong>{formatCompetenceLabel(receiptModalTithe.competenceMonth)}</strong>
                </div>
                <div>
                  <span className="text-[10px] uppercase text-slate-500 block">Data / Hora</span>
                  <strong>{receiptModalTithe.paidAtIso}</strong>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-cyan-600 bg-slate-50 p-3 text-center">
                <span className="text-[10px] uppercase text-slate-500 block">Valor Devolvido</span>
                <strong className="text-xl text-slate-900">
                  {formatBRL(receiptModalTithe.amount)}
                </strong>
              </div>

              <div className="text-[11px] text-slate-600 border-t border-slate-200 pt-2">
                <div>
                  <strong>Autenticação Bancária (E2E):</strong>{" "}
                  <code className="break-all">{receiptModalTithe.e2eCode}</code>
                </div>
                {receiptModalTithe.reconciledBy && (
                  <div>Conciliado por: {receiptModalTithe.reconciledBy}</div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            {receiptModalTithe && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleCopyReceiptText(receiptModalTithe)}
                >
                  <Copy className="h-4 w-4 mr-1.5" /> Copiar
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleShareWhatsapp(receiptModalTithe)}
                >
                  <Send className="h-4 w-4 mr-1.5" /> Enviar p/ WhatsApp
                </Button>
                <Button
                  type="button"
                  onClick={() => handlePrintReceipt(receiptModalTithe)}
                >
                  <Printer className="h-4 w-4 mr-1.5" /> Baixar PDF / Imprimir
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
