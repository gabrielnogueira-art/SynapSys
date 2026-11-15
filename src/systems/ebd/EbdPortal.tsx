import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, UserCog, Music4, ShieldCheck } from "lucide-react";
import { TodayStatusDialog } from "@/components/TodayStatusDialog";
import { ContractOverrides, PlatformContract } from "@/platform/types";

interface EbdPortalProps {
  contract?: PlatformContract;
  overrides?: ContractOverrides;
  basePath?: string;
}

/**
 * Portal do Sistema de Gestão da EBD (produção / Supabase).
 * Funciona tanto de forma isolada em /ebd quanto dentro de um contrato (/c/:contractId).
 */
export const EbdPortal = ({ contract, overrides, basePath = "" }: EbdPortalProps) => {
  const title = overrides?.customBrandTitle || "Sistema de Gestão da EBD";
  const subtitle =
    overrides?.customSubtitle ||
    "Selecione uma das opções abaixo para acessar o sistema da Escola Bíblica Dominical";

  const formPath = basePath ? `${basePath}/form` : "/form";
  const choirPath = basePath ? `${basePath}/coristas` : "/coristas";
  const loginPath = basePath ? `${basePath}/login` : "/login";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          {contract && (
            <div className="flex items-center justify-center gap-2">
              <Badge variant="outline" className="bg-background/80">
                <ShieldCheck className="h-3.5 w-3.5 mr-1 text-primary" />
                {contract.code} • {contract.clientName}
              </Badge>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-bold text-primary">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Formulário
              </CardTitle>
              <CardDescription>Registre as informações da aula da sua classe.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={formPath}>
                <Button className="w-full">Aceder ao Formulário</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music4 className="h-5 w-5 text-primary" /> Hinos (Coristas)
              </CardTitle>
              <CardDescription>Visualize os hinos sugeridos para o louvor.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={choirPath}>
                <Button variant="outline" className="w-full">Ver Hinos</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCog className="h-5 w-5 text-primary" /> Área Administrativa
              </CardTitle>
              <CardDescription>
                Acesso para administradores, secretários e professores da EBD.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to={loginPath}>
                <Button variant="secondary" className="w-full">Login</Button>
              </Link>
            </CardContent>
          </Card>

          <TodayStatusDialog />
        </div>
      </div>
    </div>
  );
};
