import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Church, FolderTree, ShieldAlert, Store } from "lucide-react";
import { getModulesBySegment, SEGMENT_DEFINITIONS } from "@/platform/catalog";
import { PlatformContract } from "@/platform/types";
import type { LabPromotionsMap } from "@/platform/labs/labsTypes";

export const PlatformCatalogTab = ({
  contracts,
  labPromotions,
}: {
  contracts: PlatformContract[];
  labPromotions?: LabPromotionsMap;
}) => {
  const churchModules = getModulesBySegment("igreja", labPromotions);
  const commerceModules = getModulesBySegment("comercio", labPromotions);

  return (
    <div className="space-y-6">
      <Card className="border-border bg-muted/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Como esta estrutura evita confusão ao alterar sistemas de clientes
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Cada projeto tem uma vertical separada e cada cliente tem seu código e overrides identificados por contrato (`CTR-XXX`).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-card rounded-md border p-3 space-y-1">
            <div className="font-mono font-semibold text-accent">
              1. GitHub/src/platform/
            </div>
            <p className="text-muted-foreground">
              Painel central do empreendedor: contratos, usuários, catálogo de segmentos e fila de adequações.
            </p>
          </div>
          <div className="bg-card rounded-md border p-3 space-y-1">
            <div className="font-mono font-semibold text-primary">
              2. GitHub/src/systems/
            </div>
            <p className="text-muted-foreground">
              Motores base separados por tipo de projeto: <code>ebd/</code>, <code>church/</code> (Tesouraria e Secretaria eclesiástica) e <code>commerce/</code> (Tesouraria, Secretaria, Estoque, RH, PDV).
            </p>
          </div>
          <div className="bg-card rounded-md border p-3 space-y-1">
            <div className="font-mono font-semibold text-primary">
              3. GitHub/src/contracts/&lt;id&gt;/
            </div>
            <p className="text-muted-foreground">
              Pasta exclusiva de cada cliente (config + overrides + telas customizadas). Ao pedir uma mudança aqui, basta citar o código <code>CTR-XXX</code>.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Church className="h-5 w-5 text-primary" />
                {SEGMENT_DEFINITIONS.igreja.name}
              </CardTitle>
              <Badge className="bg-primary/10 text-primary border-primary/30">
                Projeto Eclesiástico
              </Badge>
            </div>
            <CardDescription>{SEGMENT_DEFINITIONS.igreja.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {churchModules.map((mod) => (
              <div key={mod.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{mod.name}</span>
                  <Badge variant={mod.maturity === "producao" ? "default" : "secondary"}>
                    {mod.maturity === "producao"
                      ? "Em Produção"
                      : mod.maturity === "labs"
                      ? "Promovido do Labs"
                      : "Preview Estruturado"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{mod.description}</p>
                <div className="text-[11px] font-mono text-muted-foreground pt-1">
                  Código base: {mod.systemFolder}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Store className="h-5 w-5 text-primary" />
                {SEGMENT_DEFINITIONS.comercio.name}
              </CardTitle>
              <Badge className="bg-accent/10 text-accent border-accent/30">
                Projeto Empresarial Separado
              </Badge>
            </div>
            <CardDescription>{SEGMENT_DEFINITIONS.comercio.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {commerceModules.map((mod) => (
              <div key={mod.id} className="rounded-lg border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm">{mod.name}</span>
                  <Badge variant="secondary">Preview Estruturado</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{mod.description}</p>
                <div className="text-[11px] font-mono text-muted-foreground pt-1">
                  Código base: {mod.systemFolder}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-primary" /> Mapa Atual de Pastas por Contrato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded border text-sm"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="font-mono">{c.code}</Badge>
                  <span className="font-medium">{c.clientName}</span>
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded">
                  GitHub/{c.codeFolder}/
                </code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
