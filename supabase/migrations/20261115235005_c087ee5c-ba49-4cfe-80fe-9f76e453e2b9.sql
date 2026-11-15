CREATE FUNCTION platform_private.create_contract(_id text,_code text,_data jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE mid uuid; BEGIN
IF NOT public.is_master(auth.uid()) THEN RAISE EXCEPTION 'Somente Master pode criar contratos'; END IF;
IF _data->>'segment'='igreja' THEN INSERT INTO public.ministries(name,display_name,city) VALUES(_data->>'clientName',_data->>'clientName',_data->>'city') RETURNING id INTO mid; END IF;
INSERT INTO public.platform_contracts(id,code,data,ministry_id) VALUES(_id,_code,_data,mid);
END $$;
REVOKE ALL ON FUNCTION platform_private.create_contract(text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION platform_private.create_contract(text,text,jsonb) TO authenticated;
CREATE FUNCTION public.create_platform_contract(_id text,_code text,_data jsonb) RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path=public AS $$ SELECT platform_private.create_contract(_id,_code,_data) $$;
REVOKE ALL ON FUNCTION public.create_platform_contract(text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_platform_contract(text,text,jsonb) TO authenticated;