import { useMemo, useState } from "react";
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
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  PackageCheck,
  Plus,
  Shirt,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import type {
  LabRoleMode,
  LivrariaCategory,
  LivrariaData,
  LivrariaProduct,
} from "@/platform/labs/labsTypes";
import { computeLivrariaSummary } from "@/platform/labs/labsDefaults";
import { formatBRL, todayIsoDate } from "@/platform/saasDefaults";
import { useToast } from "@/hooks/use-toast";

interface LivrariaWorkspaceProps {
  data: LivrariaData;
  onChange: (next: LivrariaData) => void;
  roleMode?: LabRoleMode;
  isSandbox?: boolean;
}

const CAT_LABELS: Record<LivrariaCategory, string> = {
  revista_ebd: "Revista EBD",
  livro_biblia: "Livro / Bíblia",
  vestuario: "Vestuário / Congresso",
  artigo: "Artigo / Outros",
};

export const LivrariaWorkspace = ({
  data,
  onChange,
  roleMode = "admin",
  isSandbox = false,
}: LivrariaWorkspaceProps) => {
  const { toast } = useToast();
  const isAdmin = roleMode === "admin";
  const canSell = roleMode === "admin" || roleMode === "operador";

  const [catFilter, setCatFilter] = useState<"all" | LivrariaCategory>("all");

  // New Product form
  const [newProdOpen, setNewProdOpen] = useState(false);
  const [pName, setPName] = useState("");
  const [pCat, setPCat] = useState<LivrariaCategory>("revista_ebd");
  const [pTrimester, setPTrimester] = useState("4º Trimestre 2026");
  const [pAgeGroup, setPAgeGroup] = useState("Adultos");
  const [pAudience, setPAudience] = useState<"aluno" | "professor">("aluno");
  const [pSize, setPSize] = useState<NonNullable<LivrariaProduct["size"]>>("M");
  const [pStock, setPStock] = useState("20");
  const [pMinAlert, setPMinAlert] = useState("5");
  const [pCost, setPCost] = useState("10.00");
  const [pPrice, setPPrice] = useState("18.00");

  // Quick sale form
  const [saleProdId, setSaleProdId] = useState<string>(data.products[0]?.id ?? "");
  const [saleQty, setSaleQty] = useState("1");
  const [salePayMethod, setSalePayMethod] = useState<"pix" | "dinheiro" | "cartao">("pix");
  const [salePayStatus, setSalePayStatus] = useState<"pago" | "pendente">("pago");
  const [saleDelStatus, setSaleDelStatus] = useState<"entregue" | "pendente">("entregue");
  const [saleCustomer, setSaleCustomer] = useState("");

  // Expense form
  const [expDesc, setExpDesc] = useState("");
  const [expSupplier, setExpSupplier] = useState("Editora CPAD");
  const [expAmount, setExpAmount] = useState("");

  const summary = useMemo(() => computeLivrariaSummary(data), [data]);
  const filteredProducts = useMemo(
    () =>
      catFilter === "all"
        ? data.products
        : data.products.filter((p) => p.category === catFilter),
    [data.products, catFilter]
  );

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim()) return;
    const prod: LivrariaProduct = {
      id: `liv-${Date.now()}`,
      name: pName.trim(),
      category: pCat,
      ...(pCat === "revista_ebd"
        ? {
            trimester: pTrimester.trim() || undefined,
            ageGroup: pAgeGroup.trim() || undefined,
            audience: pAudience,
          }
        : {}),
      ...(pCat === "vestuario" ? { size: pSize } : {}),
      stockQty: Math.max(0, Math.floor(Number(pStock) || 0)),
      minStockAlert: Math.max(1, Math.floor(Number(pMinAlert) || 5)),
      costPrice: Math.max(0, parseFloat(pCost) || 0),
      salePrice: Math.max(0, parseFloat(pPrice) || 0),
    };
    onChange({
      ...data,
      products: [prod, ...data.products],
    });
    setSaleProdId(prod.id);
    setPName("");
    setNewProdOpen(false);
    toast({ title: `${prod.name} adicionado ao estoque da livraria!` });
  };

  const adjustStock = (prodId: string, delta: number) => {
    onChange({
      ...data,
      products: data.products.map((p) =>
        p.id === prodId ? { ...p, stockQty: Math.max(0, p.stockQty + delta) } : p
      ),
    });
  };

  const handleRegisterSale = (e: React.FormEvent) => {
    e.preventDefault();
    const product = data.products.find((p) => p.id === saleProdId) ?? data.products[0];
    if (!product) return;
    const qty = Math.max(1, Math.floor(Number(saleQty) || 1));
    if (product.stockQty < qty) {
      toast({
        variant: "destructive",
        title: `Estoque insuficiente (${product.stockQty} un. disponível)`,
      });
      return;
    }
    const label =
      product.category === "vestuario" && product.size
        ? `${product.name} (${product.size})`
        : product.name;
    const sale = {
      id: `lsale-${Date.now()}`,
      createdAt: new Date().toISOString(),
      productId: product.id,
      productName: label,
      qty,
      unitCost: product.costPrice,
      unitPrice: product.salePrice,
      total: Math.round(qty * product.salePrice * 100) / 100,
      paymentMethod: salePayMethod,
      paymentStatus: salePayStatus,
      deliveryStatus: saleDelStatus,
      customerName: saleCustomer.trim() || undefined,
    };
    onChange({
      ...data,
      products: data.products.map((p) =>
        p.id === product.id ? { ...p, stockQty: Math.max(0, p.stockQty - qty) } : p
      ),
      sales: [sale, ...data.sales],
    });
    setSaleCustomer("");
    toast({ title: `Saída registrada: ${qty}x ${label}` });
  };

  const toggleSaleField = (
    saleId: string,
    field: "paymentStatus" | "deliveryStatus"
  ) => {
    onChange({
      ...data,
      sales: data.sales.map((s) => {
        if (s.id !== saleId) return s;
        if (field === "paymentStatus") {
          return { ...s, paymentStatus: s.paymentStatus === "pago" ? "pendente" : "pago" };
        }
        return { ...s, deliveryStatus: s.deliveryStatus === "entregue" ? "pendente" : "entregue" };
      }),
    });
  };

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmount);
    if (!expDesc.trim() || !Number.isFinite(amount) || amount <= 0) return;
    onChange({
      ...data,
      expenses: [
        {
          id: `lexp-${Date.now()}`,
          date: todayIsoDate(),
          description: expDesc.trim(),
          supplier: expSupplier.trim() || undefined,
          category: "editora",
          amount,
        },
        ...data.expenses,
      ],
    });
    setExpDesc("");
    setExpAmount("");
    toast({ title: "Despesa / pedido de editora lançado!" });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base">Livraria & Materiais da EBD</h3>
              {isSandbox && <Badge variant="secondary">Sandbox Labs</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">
              Revistas EBD por trimestre/faixa, livros/bíblias com alerta de reposição e entregas de vestuário.
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" onClick={() => setNewProdOpen((v) => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" /> Novo Material / Produto
          </Button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Itens em Estoque</CardDescription>
            <CardTitle className="text-2xl">{summary.totalStockUnits} un.</CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.products.length} cadastro(s) ativo(s)
            </p>
          </CardHeader>
        </Card>

        <Card className={summary.lowStockProducts.length > 0 ? "border-amber-500/40" : ""}>
          <CardHeader className="pb-2">
            <CardDescription>Ponto de Reposição (Mínimo)</CardDescription>
            <CardTitle className="text-2xl text-amber-500">
              {summary.lowStockProducts.length} item(ns)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Estoque igual ou abaixo do limite configurado
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Entregas Pendentes</CardDescription>
            <CardTitle className="text-2xl">{summary.pendingDeliveries.length}</CardTitle>
            <p className="text-xs text-muted-foreground">
              Camisetas / materiais aguardando retirada
            </p>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>
              {isAdmin ? "Resultado Líquido (Livraria)" : "Arrecadado (Vendas)"}
            </CardDescription>
            <CardTitle className="text-2xl text-emerald-500">
              {formatBRL(isAdmin ? summary.netProfit : summary.paidRevenue)}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? `Recebido ${formatBRL(summary.paidRevenue)} − Custos/Editora ${formatBRL(
                    summary.costOfGoodsSold + summary.extraExpenses
                  )}`
                : `${summary.soldUnits} unidade(s) vendida(s)`}
            </p>
          </CardHeader>
        </Card>
      </div>

      {summary.lowStockProducts.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <strong>Reposição recomendada:</strong>
          {summary.lowStockProducts.map((p) => (
            <Badge key={p.id} variant="outline" className="border-amber-500/50">
              {p.name}
              {p.size ? ` (${p.size})` : ""}: {p.stockQty} un.
            </Badge>
          ))}
        </div>
      )}

      {newProdOpen && isAdmin && (
        <Card className="border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Cadastrar Revista, Livro ou Vestuário</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-xs">Nome do Produto *</Label>
                <Input
                  placeholder="Ex.: Revista EBD Primários / Bíblia Letra Grande"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoria</Label>
                <Select value={pCat} onValueChange={(v) => setPCat(v as LivrariaCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAT_LABELS).map(([k, lbl]) => (
                      <SelectItem key={k} value={k}>
                        {lbl}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estoque Inicial / Alerta</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="0"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value)}
                    placeholder="Qtd"
                  />
                  <Input
                    type="number"
                    min="1"
                    value={pMinAlert}
                    onChange={(e) => setPMinAlert(e.target.value)}
                    placeholder="Mín"
                  />
                </div>
              </div>

              {pCat === "revista_ebd" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Trimestre</Label>
                    <Input value={pTrimester} onChange={(e) => setPTrimester(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Faixa Etária</Label>
                    <Input value={pAgeGroup} onChange={(e) => setPAgeGroup(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Público</Label>
                    <Select
                      value={pAudience}
                      onValueChange={(v) => setPAudience(v as "aluno" | "professor")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aluno">Aluno</SelectItem>
                        <SelectItem value="professor">Professor (Mestre)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {pCat === "vestuario" && (
                <div className="space-y-1">
                  <Label className="text-xs">Tamanho</Label>
                  <Select
                    value={pSize}
                    onValueChange={(v) => setPSize(v as NonNullable<LivrariaProduct["size"]>)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["PP", "P", "M", "G", "GG", "XG", "Unico"].map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Custo Editora (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pCost}
                  onChange={(e) => setPCost(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Preço Repasse (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={pPrice}
                  onChange={(e) => setPPrice(e.target.value)}
                />
              </div>
              <Button type="submit">Salvar Produto</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Grade de Estoque + Registro Rápido de Venda */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className="lg:col-span-7">
          <CardHeader className="pb-3 space-y-2">
            <CardTitle className="text-base">Acervo, Periódicos & Vestuário</CardTitle>
            <div className="flex flex-wrap gap-1.5">
              <Button
                size="sm"
                variant={catFilter === "all" ? "default" : "outline"}
                onClick={() => setCatFilter("all")}
              >
                Todos ({data.products.length})
              </Button>
              {Object.entries(CAT_LABELS).map(([k, lbl]) => (
                <Button
                  key={k}
                  size="sm"
                  variant={catFilter === k ? "default" : "outline"}
                  onClick={() => setCatFilter(k as LivrariaCategory)}
                >
                  {lbl}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5 max-h-[460px] overflow-y-auto">
            {filteredProducts.map((p) => {
              const low = p.stockQty <= p.minStockAlert;
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
                    low ? "border-amber-500/50 bg-amber-500/5" : ""
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-sm">{p.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {CAT_LABELS[p.category]}
                      </Badge>
                      {p.category === "revista_ebd" && (
                        <Badge variant="secondary" className="text-[10px]">
                          {p.trimester} • {p.ageGroup} •{" "}
                          {p.audience === "professor" ? "Mestre" : "Aluno"}
                        </Badge>
                      )}
                      {p.category === "vestuario" && p.size && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Shirt className="h-3 w-3 mr-1" /> Tam. {p.size}
                        </Badge>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      Repasse: <strong className="text-foreground">{formatBRL(p.salePrice)}</strong>
                      {isAdmin && ` • Custo: ${formatBRL(p.costPrice)}`} • Estoque:{" "}
                      <strong className={low ? "text-amber-500" : "text-emerald-500"}>
                        {p.stockQty} un.
                      </strong>{" "}
                      (mín. {p.minStockAlert})
                    </div>
                  </div>

                  {canSell && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => adjustStock(p.id, 5)}
                        title="Dar entrada de 5 unidades"
                      >
                        +5
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        className="h-7 px-2 text-[11px]"
                        onClick={() => setSaleProdId(p.id)}
                      >
                        Vender
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Registrar Venda / Encomenda */}
        <Card className="lg:col-span-5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-primary" />
              Registrar Venda ou Entrega de Material
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegisterSale} className="space-y-3 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Produto / Revista / Camiseta *</Label>
                <Select value={saleProdId} onValueChange={setSaleProdId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um item" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                        {p.size ? ` (${p.size})` : ""} — {formatBRL(p.salePrice)} ({p.stockQty} un.)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Quantidade</Label>
                  <Input
                    type="number"
                    min="1"
                    value={saleQty}
                    onChange={(e) => setSaleQty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Meio</Label>
                  <Select
                    value={salePayMethod}
                    onValueChange={(v) => setSalePayMethod(v as "pix" | "dinheiro" | "cartao")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pix">PIX</SelectItem>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao">Cartão</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Pagamento</Label>
                  <Select
                    value={salePayStatus}
                    onValueChange={(v) => setSalePayStatus(v as "pago" | "pendente")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pago">Pago</SelectItem>
                      <SelectItem value="pendente">Fiado / Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Entrega</Label>
                  <Select
                    value={saleDelStatus}
                    onValueChange={(v) => setSaleDelStatus(v as "entregue" | "pendente")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entregue">Entregue agora</SelectItem>
                      <SelectItem value="pendente">Retirada pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Membro / Classe EBD (opcional)</Label>
                <Input
                  placeholder="Ex.: Classe Jovens / Irmã Ana"
                  value={saleCustomer}
                  onChange={(e) => setSaleCustomer(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full" disabled={!canSell}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Registrar Saída & Baixar Estoque
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Vendas & Entregas + Despesas de Editora */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card className={isAdmin ? "lg:col-span-7" : "lg:col-span-12"}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PackageCheck className="h-4 w-4 text-primary" />
              Histórico de Vendas & Controle de Entregas ({data.sales.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {data.sales.map((s) => (
              <div
                key={s.id}
                className="rounded border p-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <div className="font-semibold">
                    {s.qty}x {s.productName}
                  </div>
                  <div className="text-muted-foreground">
                    {formatBRL(s.total)} ({s.paymentMethod.toUpperCase()})
                    {s.customerName ? ` • ${s.customerName}` : ""}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant={s.paymentStatus === "pago" ? "outline" : "destructive"}
                    className="h-6 px-2 text-[10px]"
                    disabled={!canSell}
                    onClick={() => toggleSaleField(s.id, "paymentStatus")}
                  >
                    {s.paymentStatus === "pago" ? "Pago" : "Pgto Pendente"}
                  </Button>
                  <Button
                    size="sm"
                    variant={s.deliveryStatus === "entregue" ? "secondary" : "default"}
                    className="h-6 px-2 text-[10px]"
                    disabled={!canSell}
                    onClick={() => toggleSaleField(s.id, "deliveryStatus")}
                  >
                    {s.deliveryStatus === "entregue" ? "Entregue" : "Marcar Entregue"}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="lg:col-span-5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Despesas com Editora & Congressos</CardTitle>
              <CardDescription>Compõe o resultado líquido da livraria.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <form onSubmit={handleAddExpense} className="space-y-2 text-xs">
                <Input
                  placeholder="Descrição (ex.: Remessa revistas 1º Trim.)"
                  value={expDesc}
                  onChange={(e) => setExpDesc(e.target.value)}
                />
                <div className="flex gap-2">
                  <Input
                    placeholder="Editora / Fornecedor"
                    value={expSupplier}
                    onChange={(e) => setExpSupplier(e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Valor R$"
                    className="w-32"
                    value={expAmount}
                    onChange={(e) => setExpAmount(e.target.value)}
                  />
                  <Button type="submit" size="sm">
                    Lançar
                  </Button>
                </div>
              </form>
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {data.expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="rounded border px-2.5 py-1.5 flex items-center justify-between text-xs"
                  >
                    <span>
                      {exp.description}
                      {exp.supplier ? ` (${exp.supplier})` : ""}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <strong className="text-destructive">−{formatBRL(exp.amount)}</strong>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() =>
                          onChange({
                            ...data,
                            expenses: data.expenses.filter((x) => x.id !== exp.id),
                          })
                        }
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
