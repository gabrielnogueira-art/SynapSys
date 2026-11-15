import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { canManageMembership } from "./permissions.ts";
import { z } from "npm:zod@3.25.76";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("create"), name: z.string().trim().min(1).max(160), email: z.string().trim().email().max(255),
    password: z.string().min(8).max(128), contractId: z.string().regex(/^[a-z0-9][a-z0-9-]{1,120}$/),
    roleLabel: z.string().trim().max(120).optional(), accessLevel: z.enum(["gestor_contrato", "operador", "professor"]),
  }),
  z.object({ action: z.literal("status"), membership_id: z.string().uuid(), status: z.enum(["ativo", "bloqueado"]) }),
  z.object({ action: z.literal("remove"), membership_id: z.string().uuid() }),
  z.object({ action: z.literal("branding"), contractId: z.string(), branding: z.object({
    logoUrl: z.string().url().startsWith("https://").nullable(),
    primaryHsl: z.string().regex(/^\d+(?:\.\d+)?\s+\d+(?:\.\d+)?%\s+\d+(?:\.\d+)?%$/).nullable(),
    presidentPastor: z.string().trim().max(160).nullable(),
  }) }),
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "Não autenticado" }, 401);
    const { data: u, error: ue } = await createClient(url, anon).auth.getUser(token);
    if (ue || !u.user) return json({ error: "Sessão inválida" }, 401);
    const caller = u.user.id;

    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Dados inválidos", details: parsed.error.flatten().fieldErrors }, 400);
    const body = parsed.data;

    const { data: masterRow } = await admin.from("user_roles").select("id").eq("user_id", caller).eq("role", "master").maybeSingle();
    const isMaster = !!masterRow;

    let contractId: string;
    let target: { id: string; user_id: string; access_level: string } | null = null;
    if (body.action === "create" || body.action === "branding") contractId = body.contractId;
    else {
      const { data } = await admin.from("platform_memberships").select("id,user_id,contract_id,access_level").eq("id", body.membership_id).maybeSingle();
      if (!data) return json({ error: "Vínculo não encontrado" }, 404);
      target = data; contractId = data.contract_id;
    }

    const { data: contract } = await admin.from("platform_contracts").select("id,data,ministry_id").eq("id", contractId).maybeSingle();
    if (!contract) return json({ error: "Contrato não encontrado" }, 404);
    if (!isMaster) {
      if (contract.data?.status === "suspenso") return json({ error: "Contrato suspenso" }, 403);
      const { data: own } = await admin.from("platform_memberships").select("id").eq("user_id", caller).eq("contract_id", contractId).eq("status", "ativo").eq("access_level", "gestor_contrato").maybeSingle();
      
      const touchesManager = (body.action === "create" && body.accessLevel === "gestor_contrato") || target?.access_level === "gestor_contrato";
      if (!canManageMembership({ isMaster, activeManager: !!own, suspended: contract.data?.status === "suspenso", targetIsManager: touchesManager, isSelf: target?.user_id === caller })) return json({ error: "Sem permissão para alterar este acesso" }, 403);
      if (touchesManager) return json({ error: "Somente o Master gerencia gestores do contrato" }, 403);
      if (target?.user_id === caller) return json({ error: "Você não pode alterar o próprio acesso" }, 403);
    }

    if (body.action === "branding") {
      const { error } = await admin.from("platform_contracts").update({ data: { ...contract.data, branding: body.branding } }).eq("id", contractId);
      if (error) throw error;
      return json({ ok: true });
    }
    if (body.action === "create") {
      const { data: created, error } = await admin.auth.admin.createUser({
        email: body.email, password: body.password, email_confirm: true, user_metadata: { display_name: body.name },
      });
      if (error || !created.user) return json({ error: error?.message?.includes("already") ? "Este e-mail já possui conta" : "Não foi possível criar o login" }, 400);
      await admin.from("pending_users").update({ status: "approved", decided_by: caller, decided_at: new Date().toISOString() }).eq("user_id", created.user.id);
      const { error: me } = await admin.from("platform_memberships").insert({
        user_id: created.user.id, contract_id: contractId, access_level: body.accessLevel, status: "ativo",
        data: { name: body.name, email: body.email, roleLabel: body.roleLabel || body.accessLevel, authSource: "supabase" },
      });
      if (me) { await admin.auth.admin.deleteUser(created.user.id); return json({ error: "Não foi possível vincular o usuário" }, 400); }
      if (body.accessLevel === "gestor_contrato" && contract.ministry_id) {
        const { error: re } = await admin.from("user_roles").insert({ user_id: created.user.id, role: "igreja_mae", ministry_id: contract.ministry_id });
        if (re) {
          await admin.from("platform_memberships").delete().eq("user_id", created.user.id).eq("contract_id", contractId);
          await admin.auth.admin.deleteUser(created.user.id);
          return json({ error: "Não foi possível vincular o gestor à organização" }, 400);
        }
      }
      return json({ ok: true });
    }
    if (!target) return json({ error: "Vínculo não encontrado" }, 404);
    if (body.action === "status") {
      const { error } = await admin.from("platform_memberships").update({ status: body.status }).eq("id", target.id);
      if (error) throw error;
      return json({ ok: true });
    }
    const { error } = await admin.from("platform_memberships").delete().eq("id", target.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    console.error("platform-users", e);
    return json({ error: "Erro interno ao gerenciar usuários" }, 500);
  }
});
