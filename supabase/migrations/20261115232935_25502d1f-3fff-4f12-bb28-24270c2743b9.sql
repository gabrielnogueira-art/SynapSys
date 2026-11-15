CREATE TABLE public.platform_contracts (id text PRIMARY KEY, code text NOT NULL UNIQUE, data jsonb NOT NULL, ministry_id uuid REFERENCES public.ministries(id) ON DELETE RESTRICT, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_contracts TO authenticated; GRANT ALL ON public.platform_contracts TO service_role;
ALTER TABLE public.platform_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_contracts ON public.platform_contracts FOR ALL TO authenticated USING(public.is_master(auth.uid())) WITH CHECK(public.is_master(auth.uid()));
CREATE TABLE public.platform_memberships (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, contract_id text NOT NULL REFERENCES public.platform_contracts(id) ON DELETE CASCADE, access_level text NOT NULL DEFAULT 'operador', status text NOT NULL DEFAULT 'ativo', data jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id,contract_id));
GRANT SELECT ON public.platform_memberships TO authenticated; GRANT ALL ON public.platform_memberships TO service_role;
ALTER TABLE public.platform_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY master_memberships ON public.platform_memberships FOR SELECT TO authenticated USING(public.is_master(auth.uid()));
CREATE OR REPLACE FUNCTION public.platform_can_access(_contract_id text, _manage boolean DEFAULT false) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.is_master(auth.uid()) OR EXISTS(SELECT 1 FROM public.platform_memberships pm JOIN public.platform_contracts pc ON pc.id=pm.contract_id WHERE pm.user_id=auth.uid() AND pm.contract_id=_contract_id AND pm.status='ativo' AND pc.data->>'status'<>'suspenso' AND (NOT _manage OR pm.access_level='gestor_contrato')) $$;
REVOKE ALL ON FUNCTION public.platform_can_access(text,boolean) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.platform_can_access(text,boolean) TO authenticated,service_role;
CREATE POLICY scoped_contracts ON public.platform_contracts FOR SELECT TO authenticated USING(public.platform_can_access(id));
CREATE POLICY scoped_memberships ON public.platform_memberships FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.platform_can_access(contract_id,true));
CREATE TABLE public.platform_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), contract_id text NOT NULL REFERENCES public.platform_contracts(id) ON DELETE CASCADE, data jsonb NOT NULL, created_by uuid NOT NULL DEFAULT auth.uid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.platform_requests TO authenticated; GRANT ALL ON public.platform_requests TO service_role;
ALTER TABLE public.platform_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY scoped_requests_read ON public.platform_requests FOR SELECT TO authenticated USING(public.platform_can_access(contract_id));
CREATE POLICY scoped_requests_create ON public.platform_requests FOR INSERT TO authenticated WITH CHECK(public.platform_can_access(contract_id) AND created_by=auth.uid() AND data->>'status'='solicitado');
CREATE POLICY master_requests_change ON public.platform_requests FOR UPDATE TO authenticated USING(public.is_master(auth.uid())) WITH CHECK(public.is_master(auth.uid()));
CREATE POLICY master_requests_delete ON public.platform_requests FOR DELETE TO authenticated USING(public.is_master(auth.uid()));
CREATE OR REPLACE FUNCTION public.validate_platform_record() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
NEW.updated_at=now();
IF TG_TABLE_NAME='platform_contracts' THEN
IF NEW.id !~ '^[a-z0-9][a-z0-9-]{1,120}$' OR length(trim(COALESCE(NEW.data->>'clientName','')))=0 OR NEW.data->>'segment' NOT IN ('igreja','comercio') OR NEW.data->>'status' NOT IN ('ativo','implantacao','demonstracao','suspenso') OR jsonb_typeof(NEW.data->'activeModules') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Contrato inválido'; END IF;
IF jsonb_array_length(NEW.data->'activeModules')=0 THEN RAISE EXCEPTION 'Selecione ao menos um módulo'; END IF;
IF EXISTS(SELECT 1 FROM jsonb_array_elements_text(NEW.data->'activeModules') m WHERE (NEW.data->>'segment'='igreja' AND m NOT IN ('igreja_ebd','igreja_tesouraria','igreja_secretaria')) OR (NEW.data->>'segment'='comercio' AND m NOT IN ('comercio_tesouraria','comercio_secretaria','comercio_estoque','comercio_rh','comercio_pdv'))) THEN RAISE EXCEPTION 'Módulo incompatível'; END IF;
ELSIF TG_TABLE_NAME='platform_memberships' THEN
IF NEW.access_level NOT IN ('gestor_contrato','operador','professor') OR NEW.status NOT IN ('ativo','pendente','bloqueado') THEN RAISE EXCEPTION 'Vínculo inválido'; END IF;
ELSIF TG_TABLE_NAME='platform_requests' THEN
IF NEW.data->>'status' NOT IN ('solicitado','em_andamento','concluido') OR length(trim(COALESCE(NEW.data->>'title','')))=0 THEN RAISE EXCEPTION 'Solicitação inválida'; END IF;
END IF; RETURN NEW; END $$;
CREATE TRIGGER validate_platform_contracts BEFORE INSERT OR UPDATE ON public.platform_contracts FOR EACH ROW EXECUTE FUNCTION public.validate_platform_record();
CREATE TRIGGER validate_platform_memberships BEFORE INSERT OR UPDATE ON public.platform_memberships FOR EACH ROW EXECUTE FUNCTION public.validate_platform_record();
CREATE TRIGGER validate_platform_requests BEFORE INSERT OR UPDATE ON public.platform_requests FOR EACH ROW EXECUTE FUNCTION public.validate_platform_record();
CREATE INDEX platform_memberships_user_idx ON public.platform_memberships(user_id,status);
CREATE INDEX platform_requests_contract_idx ON public.platform_requests(contract_id);
CREATE OR REPLACE FUNCTION public.resolve_platform_contract(_id text) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT jsonb_build_object('id',id,'code',code,'clientName',data->>'clientName','segment',data->>'segment','status',data->>'status','activeModules',data->'activeModules','entryPath','/c/'||id,'codeFolder','src/contracts/'||id,'authSource','supabase','createdAt',created_at::date,'branding',COALESCE(data->'branding','{}')) FROM public.platform_contracts WHERE id=_id $$;
REVOKE ALL ON FUNCTION public.resolve_platform_contract(text) FROM PUBLIC; GRANT EXECUTE ON FUNCTION public.resolve_platform_contract(text) TO anon,authenticated,service_role;
INSERT INTO public.platform_contracts(id,code,ministry_id,data) SELECT CASE WHEN m.id='cccccccc-0000-0000-0000-000000000001' THEN 'ctr-001-ebd-exemplo' ELSE 'igreja-'||m.id END, 'CTR-'||lpad(row_number() OVER(ORDER BY m.created_at)::text,3,'0'),m.id,jsonb_build_object('clientName',COALESCE(m.display_name,m.name),'segment','igreja','status','ativo','activeModules',jsonb_build_array('igreja_ebd'),'city',m.city,'branding',jsonb_build_object('logoUrl',m.logo_url,'primaryHsl',m.brand_primary_hsl,'presidentPastor',m.president_pastor)) FROM public.ministries m;
INSERT INTO public.platform_memberships(user_id,contract_id,access_level,status,data)
SELECT DISTINCT ON (ur.user_id,pc.id) ur.user_id,pc.id, CASE WHEN ur.role='igreja_mae' THEN 'gestor_contrato' WHEN ur.role='professor_classe' THEN 'professor' ELSE 'operador' END,'ativo',jsonb_build_object('name',COALESCE(pu.display_name,pu.email,'Usuário EBD'),'email',pu.email,'roleLabel',ur.role::text,'authSource','supabase')
FROM public.user_roles ur LEFT JOIN public.headquarters h ON h.id=ur.headquarters_id LEFT JOIN public.regionals r ON r.id=ur.regional_id LEFT JOIN public.congregations c ON c.id=ur.congregation_id LEFT JOIN public.headquarters hr ON hr.id=r.headquarters_id LEFT JOIN public.headquarters hc ON hc.id=c.headquarters_id JOIN public.platform_contracts pc ON pc.ministry_id=COALESCE(ur.ministry_id,h.ministry_id,hr.ministry_id,hc.ministry_id) LEFT JOIN public.pending_users pu ON pu.user_id=ur.user_id WHERE ur.role<>'master' ORDER BY ur.user_id,pc.id,CASE ur.role WHEN 'igreja_mae' THEN 1 WHEN 'igreja_sede' THEN 2 ELSE 3 END;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_contracts, public.platform_memberships, public.platform_requests;