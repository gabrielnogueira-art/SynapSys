CREATE TABLE public.platform_module_data (
contract_id text NOT NULL REFERENCES public.platform_contracts(id) ON DELETE CASCADE,
module_key text NOT NULL,
data jsonb NOT NULL,
created_at timestamptz NOT NULL DEFAULT now(),
updated_at timestamptz NOT NULL DEFAULT now(),
PRIMARY KEY(contract_id,module_key)
);
GRANT SELECT,INSERT,UPDATE,DELETE ON public.platform_module_data TO authenticated;
GRANT ALL ON public.platform_module_data TO service_role;
ALTER TABLE public.platform_module_data ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION platform_private.can_access_module(_contract_id text,_module_key text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT (_module_key IN ('commerce','church_treasury','church_members','church_units')) AND platform_private.platform_can_access(_contract_id) AND EXISTS (SELECT 1 FROM public.platform_contracts c WHERE c.id=_contract_id AND CASE _module_key WHEN 'commerce' THEN c.data->>'segment'='comercio' WHEN 'church_treasury' THEN c.data->'activeModules' ? 'igreja_tesouraria' ELSE c.data->'activeModules' ? 'igreja_secretaria' END)
$$;
REVOKE ALL ON FUNCTION platform_private.can_access_module(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION platform_private.can_access_module(text,text) TO authenticated,service_role;
CREATE POLICY scoped_module_data ON public.platform_module_data FOR ALL TO authenticated USING(platform_private.can_access_module(contract_id,module_key)) WITH CHECK(platform_private.can_access_module(contract_id,module_key));
CREATE OR REPLACE FUNCTION public.touch_platform_module_data() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER touch_platform_module_data BEFORE UPDATE ON public.platform_module_data FOR EACH ROW EXECUTE FUNCTION public.touch_platform_module_data();
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_module_data;