import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, ArrowLeft } from "lucide-react";
import { useContractBasePath } from "@/platform/useContractBasePath";
import { usePlatformStore } from "@/platform/store";
import { getModuleById } from "@/platform/catalog";

const Signup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const store = usePlatformStore();
  const { resolve, isInsideContract, basePath } = useContractBasePath();

  const contractSlugOrId = basePath.replace(/^\/c\//, "");
  const currentContract = isInsideContract
    ? store.contracts.find((c) => c.id === contractSlugOrId || c.slug === contractSlugOrId)
    : undefined;

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [requestedArea, setRequestedArea] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            display_name: name,
            ...(currentContract
              ? {
                  contract_id: currentContract.id,
                  requested_area: requestedArea || null,
                  notes: notes.trim() || null,
                }
              : {}),
          },
        },
      });
      if (error) throw error;
      await supabase.auth.signOut();
      setSubmitted(true);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Erro no cadastro", description: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary/10 via-background to-blue-500/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Button
          variant="ghost"
          onClick={() => navigate(resolve("/login"))}
          className="flex items-center gap-2 text-muted-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card className="shadow-2xl border-primary/20">
          <CardHeader className="text-center">
            {currentContract?.branding?.logoUrl && (
              <img
                src={currentContract.branding.logoUrl}
                alt={currentContract.clientName}
                className="h-14 max-w-full object-contain mx-auto mb-2"
              />
            )}
            <UserPlus className="mx-auto h-12 w-12 text-primary mb-3" />
            <CardTitle className="text-2xl font-bold">
              {currentContract ? `Solicitar acesso — ${currentContract.clientName}` : "Criar conta"}
            </CardTitle>
            <CardDescription>
              Sua solicitação será enviada ao administrador do contrato para aprovação.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="text-center space-y-4">
                <p className="text-sm">
                  Solicitação recebida! Aguarde a aprovação de um administrador para acessar o sistema.
                </p>
                <Button onClick={() => navigate(resolve("/login"))} className="w-full">
                  Voltar ao login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  placeholder="Nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="h-11"
                />
                <Input
                  type="email"
                  placeholder="E-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11"
                />
                <Input
                  type="password"
                  placeholder="Senha (mínimo 8 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="h-11"
                />

                {currentContract && currentContract.activeModules.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs">Área desejada</Label>
                    <Select value={requestedArea} onValueChange={setRequestedArea}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione a área (ex.: EBD, Tesouraria)" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentContract.activeModules.map((modId) => (
                          <SelectItem key={modId} value={modId}>
                            {getModuleById(modId)?.name ?? modId}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {currentContract && (
                  <Input
                    placeholder="Cargo ou observação (opcional, ex.: Tesoureiro)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="h-11"
                  />
                )}

                <Button type="submit" disabled={loading} className="w-full h-11 text-base">
                  {loading ? "Enviando..." : "Solicitar acesso"}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Já tem conta?{" "}
                  <Link to={resolve("/login")} className="text-primary underline">
                    Entrar
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
