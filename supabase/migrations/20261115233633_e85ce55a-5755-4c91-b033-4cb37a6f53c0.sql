CREATE SCHEMA IF NOT EXISTS platform_private;
GRANT USAGE ON SCHEMA platform_private TO authenticated,service_role;
ALTER FUNCTION public.platform_can_access(text,boolean) SET SCHEMA platform_private;
REVOKE ALL ON FUNCTION platform_private.platform_can_access(text,boolean) FROM PUBLIC,anon;
DROP FUNCTION public.resolve_platform_contract(text);
CREATE VIEW public.platform_contract_directory AS SELECT id,code,jsonb_build_object('id',id,'code',code,'clientName',data->>'clientName','segment',data->>'segment','status',data->>'status','activeModules',data->'activeModules','entryPath','/c/'||id,'codeFolder','src/contracts/'||id,'authSource','supabase','createdAt',created_at::date,'branding',COALESCE(data->'branding','{}')) AS data FROM public.platform_contracts;
GRANT SELECT ON public.platform_contract_directory TO anon,authenticated,service_role;
COMMENT ON VIEW public.platform_contract_directory IS 'Intentional public directory: branding and enabled modules only; no billing, private notes, ministry identifiers or user data.';