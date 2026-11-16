import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { buildCredentialUpdate } from "@/platform/accountCredentials";

export function AccountAccessDialog({ open, onOpenChange, email }: { open: boolean; onOpenChange: (open: boolean) => void; email: string }) {
  const [nextEmail, setNextEmail] = useState(email);
  const [password, setPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  useEffect(() => { if (open) { setNextEmail(email); setPassword(""); setCurrentPassword(""); setConfirmation(""); } }, [open, email]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (password !== confirmation) throw new Error("As novas senhas não coincidem.");
      const { data: user, error: userError } = await supabase.auth.getUser();
      if (userError || !user.user) throw new Error("Entre novamente para alterar seu acesso.");
      const update = buildCredentialUpdate(nextEmail, user.user.email ?? "", password, currentPassword);
      const { error } = await supabase.auth.updateUser(update, { emailRedirectTo: `${window.location.origin}/login?next=/plataforma` });
      if (error) throw error;
      toast({ title: "Acesso atualizado", description: update.email ? "Confira os e-mails de confirmação para concluir a troca de endereço. Seu acesso Master será mantido." : "Sua senha foi alterada." });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: "destructive", title: "Não foi possível alterar o acesso", description: error instanceof Error ? error.message : "Tente novamente." });
    } finally { setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!busy) onOpenChange(value); }}><DialogContent><DialogHeader><DialogTitle>Meu acesso</DialogTitle></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor="account-email">E-mail de acesso</Label><Input id="account-email" type="email" autoComplete="email" value={nextEmail} onChange={(e) => setNextEmail(e.target.value)} required disabled={busy} /></div>
      <div className="space-y-2"><Label htmlFor="account-current">Senha atual</Label><Input id="account-current" type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required={Boolean(password)} disabled={busy} /></div>
      <div className="space-y-2"><Label htmlFor="account-password">Nova senha</Label><Input id="account-password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} disabled={busy} /></div>
      <div className="space-y-2"><Label htmlFor="account-confirm">Confirmar nova senha</Label><Input id="account-confirm" type="password" autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} required={Boolean(password)} disabled={busy} /></div>
      <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar acesso"}</Button>
    </form>
  </DialogContent></Dialog>;
}