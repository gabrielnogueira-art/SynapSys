CREATE FUNCTION platform_private.sync_ministry_contract() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF pg_trigger_depth()>1 THEN RETURN NEW; END IF;
UPDATE public.platform_contracts SET data=data || jsonb_build_object('clientName',COALESCE(NEW.display_name,NEW.name),'city',NEW.city,'branding',jsonb_build_object('logoUrl',NEW.logo_url,'primaryHsl',NEW.brand_primary_hsl,'presidentPastor',NEW.president_pastor)) WHERE ministry_id=NEW.id;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION platform_private.sync_ministry_contract() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_ministry_contract AFTER UPDATE OF name,display_name,city,logo_url,brand_primary_hsl,president_pastor ON public.ministries FOR EACH ROW EXECUTE FUNCTION platform_private.sync_ministry_contract();
CREATE FUNCTION platform_private.sync_contract_ministry() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF pg_trigger_depth()>1 OR NEW.ministry_id IS NULL THEN RETURN NEW; END IF;
UPDATE public.ministries SET display_name=NEW.data->>'clientName',city=NEW.data->>'city',logo_url=NEW.data->'branding'->>'logoUrl',brand_primary_hsl=NEW.data->'branding'->>'primaryHsl',president_pastor=NEW.data->'branding'->>'presidentPastor' WHERE id=NEW.ministry_id;
RETURN NEW; END $$;
REVOKE ALL ON FUNCTION platform_private.sync_contract_ministry() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER sync_contract_ministry AFTER UPDATE OF data ON public.platform_contracts FOR EACH ROW EXECUTE FUNCTION platform_private.sync_contract_ministry();