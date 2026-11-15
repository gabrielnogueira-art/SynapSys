DROP VIEW public.platform_contract_directory;
CREATE TABLE public.platform_contract_directory(id text PRIMARY KEY REFERENCES public.platform_contracts(id) ON DELETE CASCADE, data jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.platform_contract_directory TO anon,authenticated; GRANT ALL ON public.platform_contract_directory TO service_role;
ALTER TABLE public.platform_contract_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_client_links ON public.platform_contract_directory FOR SELECT TO anon,authenticated USING(true);
CREATE FUNCTION platform_private.sync_contract_directory() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.platform_contract_directory(id,data) VALUES(NEW.id,jsonb_build_object('id',NEW.id,'code',NEW.code,'clientName',NEW.data->>'clientName','segment',NEW.data->>'segment','status',NEW.data->>'status','activeModules',NEW.data->'activeModules','entryPath','/c/'||NEW.id,'codeFolder','src/contracts/'||NEW.id,'authSource','supabase','createdAt',NEW.created_at::date,'branding',COALESCE(NEW.data->'branding','{}'))) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION platform_private.sync_contract_directory() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_platform_contract_directory AFTER INSERT OR UPDATE ON public.platform_contracts FOR EACH ROW EXECUTE FUNCTION platform_private.sync_contract_directory();
UPDATE public.platform_contracts SET updated_at=now();