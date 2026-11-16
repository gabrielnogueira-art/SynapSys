CREATE UNIQUE INDEX platform_contract_effective_link_unique ON public.platform_contracts ((COALESCE(NULLIF(data->>'slug',''),id)));
CREATE OR REPLACE FUNCTION platform_private.validate_contract_link() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE link text;
BEGIN
PERFORM pg_advisory_xact_lock(87201931);
link := NULLIF(NEW.data->>'slug','');
IF link IS NOT NULL AND (length(link)>80 OR link !~ '^[a-z0-9]+(-[a-z0-9]+)*$') THEN RAISE EXCEPTION 'Use até 80 letras minúsculas, números e hífens no link do cliente'; END IF;
IF NEW.data ? 'requireLoginOnEntry' AND jsonb_typeof(NEW.data->'requireLoginOnEntry') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'Preferência de login inválida'; END IF;
IF EXISTS(SELECT 1 FROM public.platform_contracts c WHERE c.id<>NEW.id AND (c.id=link OR c.data->>'slug'=link OR c.data->>'slug'=NEW.id)) THEN RAISE EXCEPTION 'Este link já está em uso por outro cliente'; END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION platform_private.validate_contract_link() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER validate_contract_link BEFORE INSERT OR UPDATE ON public.platform_contracts FOR EACH ROW EXECUTE FUNCTION platform_private.validate_contract_link();
CREATE OR REPLACE FUNCTION platform_private.sync_contract_directory() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
INSERT INTO public.platform_contract_directory(id,data) VALUES(NEW.id,jsonb_build_object('id',NEW.id,'code',NEW.code,'clientName',NEW.data->>'clientName','segment',NEW.data->>'segment','status',NEW.data->>'status','activeModules',NEW.data->'activeModules','slug',NEW.data->>'slug','requireLoginOnEntry',COALESCE(NEW.data->'requireLoginOnEntry','false'::jsonb),'entryPath','/c/'||COALESCE(NULLIF(NEW.data->>'slug',''),NEW.id),'codeFolder','src/contracts/'||NEW.id,'authSource','supabase','createdAt',NEW.created_at::date,'branding',COALESCE(NEW.data->'branding','{}'))) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now(); RETURN NEW; END $$;
REVOKE ALL ON FUNCTION platform_private.sync_contract_directory() FROM PUBLIC,anon,authenticated;
UPDATE public.platform_contracts SET updated_at=now();