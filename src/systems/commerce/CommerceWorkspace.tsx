import { useContractModuleData } from "@/platform/useContractModuleData";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Briefcase,
  ClipboardList,
  DollarSign,
  Package,
  Plus,
  ShoppingCart,
  Store,
  Users,
} from "lucide-react";
import { CommerceModuleId, PlatformContract } from "@/platform/types";
import { getModuleById } from "@/platform/catalog";

interface StockItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  minQty: number;
  price: number;
}

interface CashEntry {
  id: string;
  date: string;
  kind: "receita" | "despesa";
  description: string;
  amount: number;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  shift: string;
}

interface AdminDoc {
  id: string;
  protocol: string;
  title: string;
  responsible: string;
  status: "Vigente" | "Pendente";
}

interface SaleOrder {
  id: string;
  customer: string;
  itemsSummary: string;
  total: number;
  date: string;
}

interface CommerceState {
  stock: StockItem[];
  cash: CashEntry[];
  employees: Employee[];
  docs: AdminDoc[];
  sales: SaleOrder[];
}

const DEFAULT_STATE: CommerceState = { stock: [], cash: [], employees: [], docs: [], sales: [] };

export const CommerceWorkspace = ({
  contract,
  activeModule,
  onSelectModule,
}: {
  contract: PlatformContract;
  activeModule: CommerceModuleId;
  onSelectModule: (m: CommerceModuleId) => void;
}) => {
  const { value: state, update: setState, loading, error } = useContractModuleData(contract.id, "commerce", DEFAULT_STATE);

  const enabledModules = contract.activeModules.filter((m): m is CommerceModuleId =>
    m.startsWith("comercio_")
  );

  // Quick form states
  const [newSku, setNewSku] = useState("");
  const [newProd, setNewProd] = useState("");
  const [newQty, setNewQty] = useState("10");
  const [newPrice, setNewPrice] = useState("50");

  const [cashDesc, setCashDesc] = useState("");
  const [cashVal, setCashVal] = useState("");
  const [cashKind, setCashKind] = useState<"receita" | "despesa">("receita");

  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empDept, setEmpDept] = useState("Operacional");

  const [docTitle, setDocTitle] = useState("");
  const [saleCustomer, setSaleCustomer] = useState("");
  const [saleTotal, setSaleTotal] = useState("");

  const brl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const income = state.cash.filter((c) => c.kind === "receita").reduce((s, c) => s + c.amount, 0);
  const expense = state.cash.filter((c) => c.kind === "despesa").reduce((s, c) => s + c.amount, 0);
  const lowStock = state.stock.filter((s) => s.qty <= s.minQty).length;

  if (loading) return <p className="p-6 text-muted-foreground">Carregando dados…</p>;
  if (error) return <p role="alert" className="p-6 text-destructive">{error}</p>;
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
              <Store className="h-6 w-6" /> {contract.clientName}
            </h1>
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100">
              Segmento Comércio • Projeto Separado
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Ambiente comercial isolado do segmento Igreja/EBD. Módulos contratados: {enabledModules.length}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Saldo Financeiro</CardDescription>
            <CardTitle className="text-2xl text-emerald-700">{brl(income - expense)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Itens em Estoque</CardDescription>
            <CardTitle className="text-2xl">{state.stock.length} SKUs</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Alertas de Estoque Baixo</CardDescription>
            <CardTitle className={`text-2xl ${lowStock > 0 ? "text-amber-600" : ""}`}>
              {lowStock}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Colaboradores (RH)</CardDescription>
            <CardTitle className="text-2xl">{state.employees.length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs
        value={activeModule}
        onValueChange={(v) => onSelectModule(v as CommerceModuleId)}
        className="space-y-4"
      >
        <TabsList className="flex flex-wrap h-auto gap-1 justify-start">
          {enabledModules.map((modId) => {
            const mod = getModuleById(modId);
            return (
              <TabsTrigger key={modId} value={modId}>
                {mod?.shortName ?? modId}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="comercio_tesouraria" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-emerald-600" /> Tesouraria / Fluxo de Caixa Comercial
              </CardTitle>
              <CardDescription>Receitas, pagamentos a fornecedores e despesas operacionais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const val = parseFloat(cashVal);
                  if (!cashDesc.trim() || isNaN(val) || val <= 0) return;
                  setState((prev) => ({
                    ...prev,
                    cash: [
                      {
                        id: `cs-${Date.now()}`,
                        date: new Date().toISOString().slice(0, 10),
                        kind: cashKind,
                        description: cashDesc.trim(),
                        amount: val,
                      },
                      ...prev.cash,
                    ],
                  }));
                  setCashDesc("");
                  setCashVal("");
                }}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
              >
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={cashKind === "receita" ? "default" : "outline"}
                      onClick={() => setCashKind("receita")}
                    >
                      Receita
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={cashKind === "despesa" ? "destructive" : "outline"}
                      onClick={() => setCashKind("despesa")}
                    >
                      Despesa
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Ex: Venda ou pagamento fornecedor"
                    value={cashDesc}
                    onChange={(e) => setCashDesc(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Valor (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={cashVal}
                    onChange={(e) => setCashVal(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-1" /> Registrar
                </Button>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.cash.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs">{c.date}</TableCell>
                      <TableCell>
                        <Badge variant={c.kind === "receita" ? "default" : "destructive"}>
                          {c.kind === "receita" ? "Receita" : "Despesa"}
                        </Badge>
                      </TableCell>
                      <TableCell>{c.description}</TableCell>
                      <TableCell className="text-right font-medium">{brl(c.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comercio_estoque" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4 text-emerald-600" /> Controle de Estoque & Produtos
              </CardTitle>
              <CardDescription>Itens cadastrados, saldo atual e alerta de reposição.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newProd.trim()) return;
                  setState((prev) => ({
                    ...prev,
                    stock: [
                      {
                        id: `st-${Date.now()}`,
                        sku: newSku.trim() || `SKU-${prev.stock.length + 101}`,
                        name: newProd.trim(),
                        qty: parseInt(newQty, 10) || 0,
                        minQty: 10,
                        price: parseFloat(newPrice) || 0,
                      },
                      ...prev.stock,
                    ],
                  }));
                  setNewSku("");
                  setNewProd("");
                }}
                className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
              >
                <div className="space-y-1">
                  <Label>SKU</Label>
                  <Input placeholder="SKU-104" value={newSku} onChange={(e) => setNewSku(e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label>Produto</Label>
                  <Input
                    placeholder="Nome do produto"
                    value={newProd}
                    onChange={(e) => setNewProd(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Qtd / Preço</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={newQty} onChange={(e) => setNewQty(e.target.value)} />
                    <Input type="number" step="0.01" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
                  </div>
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar Item
                </Button>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Preço Unit.</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.stock.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.qty} un</TableCell>
                      <TableCell>{brl(item.price)}</TableCell>
                      <TableCell>
                        <Badge variant={item.qty <= item.minQty ? "destructive" : "outline"}>
                          {item.qty <= item.minQty ? "Repor estoque" : "Normal"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comercio_secretaria" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-emerald-600" /> Secretaria & Administrativo Comercial
              </CardTitle>
              <CardDescription>Protocolos, documentos empresariais e rotinas administrativas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!docTitle.trim()) return;
                  setState((prev) => ({
                    ...prev,
                    docs: [
                      {
                        id: `dc-${Date.now()}`,
                        protocol: `ADM-2026-0${prev.docs.length + 1}`,
                        title: docTitle.trim(),
                        responsible: "Administrativo",
                        status: "Vigente",
                      },
                      ...prev.docs,
                    ],
                  }));
                  setDocTitle("");
                }}
                className="flex gap-3 items-end"
              >
                <div className="flex-1 space-y-1">
                  <Label>Novo Documento / Protocolo</Label>
                  <Input
                    placeholder="Ex: Contrato de Prestação de Serviço"
                    value={docTitle}
                    onChange={(e) => setDocTitle(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-1" /> Protocolar
                </Button>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Protocolo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.docs.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-mono text-xs">{d.protocol}</TableCell>
                      <TableCell>{d.title}</TableCell>
                      <TableCell>{d.responsible}</TableCell>
                      <TableCell>
                        <Badge variant={d.status === "Vigente" ? "default" : "secondary"}>
                          {d.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comercio_rh" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> RH & Gestão de Equipe
              </CardTitle>
              <CardDescription>Colaboradores, cargos, departamentos e escalas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!empName.trim()) return;
                  setState((prev) => ({
                    ...prev,
                    employees: [
                      {
                        id: `em-${Date.now()}`,
                        name: empName.trim(),
                        role: empRole.trim() || "Colaborador",
                        department: empDept.trim() || "Operacional",
                        shift: "Comercial",
                      },
                      ...prev.employees,
                    ],
                  }));
                  setEmpName("");
                  setEmpRole("");
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
              >
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do colaborador"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Input
                    placeholder="Ex: Vendedor"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Departamento</Label>
                  <Input value={empDept} onChange={(e) => setEmpDept(e.target.value)} />
                </div>
                <Button type="submit">
                  <Briefcase className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Turno</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.employees.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.role}</TableCell>
                      <TableCell>{e.department}</TableCell>
                      <TableCell>{e.shift}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comercio_pdv" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShoppingCart className="h-4 w-4 text-emerald-600" /> Vendas & PDV
              </CardTitle>
              <CardDescription>Lançamento rápido de vendas e pedidos de balcão.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const tot = parseFloat(saleTotal);
                  if (!saleCustomer.trim() || isNaN(tot) || tot <= 0) return;
                  setState((prev) => ({
                    ...prev,
                    sales: [
                      {
                        id: `vd-${Date.now()}`,
                        customer: saleCustomer.trim(),
                        itemsSummary: "Pedido avulso",
                        total: tot,
                        date: new Date().toISOString().slice(0, 10),
                      },
                      ...prev.sales,
                    ],
                  }));
                  setSaleCustomer("");
                  setSaleTotal("");
                }}
                className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end"
              >
                <div className="space-y-1 md:col-span-2">
                  <Label>Cliente / Pedido</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={saleCustomer}
                    onChange={(e) => setSaleCustomer(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label>Valor Total (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={saleTotal}
                    onChange={(e) => setSaleTotal(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit">
                  <Plus className="h-4 w-4 mr-1" /> Registrar Venda
                </Button>
              </form>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.sales.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs">{s.date}</TableCell>
                      <TableCell className="font-medium">{s.customer}</TableCell>
                      <TableCell>{s.itemsSummary}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-700">
                        {brl(s.total)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
