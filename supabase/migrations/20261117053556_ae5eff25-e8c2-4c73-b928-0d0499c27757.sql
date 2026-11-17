DROP POLICY IF EXISTS public_client_links ON public.platform_contract_directory;
CREATE POLICY directory_scoped_read ON public.platform_contract_directory FOR SELECT TO authenticated
USING (public.is_master(auth.uid()) OR EXISTS (SELECT 1 FROM public.platform_memberships m WHERE m.contract_id = platform_contract_directory.id AND m.user_id = auth.uid()));
REVOKE SELECT ON public.platform_contract_directory FROM anon;

CREATE OR REPLACE FUNCTION public.resolve_contract_directory(_key text)
RETURNS TABLE(id text, data jsonb, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.id, d.data, d.created_at FROM public.platform_contract_directory d
  WHERE _key IS NOT NULL AND length(_key) <= 120 AND (d.id = _key OR lower(d.data->>'slug') = lower(_key))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_contract_directory(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_contract_directory(text) TO anon, authenticated;