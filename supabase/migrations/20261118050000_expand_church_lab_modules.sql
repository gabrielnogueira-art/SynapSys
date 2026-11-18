-- Expande a whitelist de platform_module_data para suportar os novos módulos eclesiásticos
-- quando promovidos do SynapSys Labs e habilitados explicitamente em um contrato.
CREATE OR REPLACE FUNCTION platform_private.can_access_module(_contract_id text, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    _module_key IN (
      'commerce',
      'church_treasury',
      'church_members',
      'church_units',
      'church_cantina',
      'church_livraria',
      'church_social'
    )
  )
  AND platform_private.platform_can_access(_contract_id)
  AND EXISTS (
    SELECT 1
    FROM public.platform_contracts c
    WHERE c.id = _contract_id
      AND CASE _module_key
        WHEN 'commerce' THEN c.data->>'segment' = 'comercio'
        WHEN 'church_treasury' THEN c.data->'activeModules' ? 'igreja_tesouraria'
        WHEN 'church_cantina' THEN c.data->'activeModules' ? 'igreja_cantina'
        WHEN 'church_livraria' THEN c.data->'activeModules' ? 'igreja_livraria'
        WHEN 'church_social' THEN c.data->'activeModules' ? 'igreja_social'
        ELSE c.data->'activeModules' ? 'igreja_secretaria'
      END
  );
$$;

REVOKE ALL ON FUNCTION platform_private.can_access_module(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION platform_private.can_access_module(text, text) TO authenticated, service_role;
