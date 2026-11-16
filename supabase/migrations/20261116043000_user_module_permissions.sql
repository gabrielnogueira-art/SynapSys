CREATE OR REPLACE FUNCTION platform_private.can_access_module(_contract_id text, _module_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (_module_key IN ('commerce', 'church_treasury', 'church_members', 'church_units'))
    AND platform_private.platform_can_access(_contract_id)
    AND EXISTS (
      SELECT 1
      FROM public.platform_contracts c
      WHERE c.id = _contract_id
        AND CASE _module_key
          WHEN 'commerce' THEN c.data->>'segment' = 'comercio'
          WHEN 'church_treasury' THEN c.data->'activeModules' ? 'igreja_tesouraria'
          ELSE c.data->'activeModules' ? 'igreja_secretaria'
        END
        AND (
          public.is_master(auth.uid())
          OR EXISTS (
            SELECT 1
            FROM public.platform_memberships pm
            CROSS JOIN LATERAL (
              SELECT COALESCE(
                CASE
                  WHEN jsonb_typeof(pm.data->'allowedModules') = 'array'
                       AND jsonb_array_length(pm.data->'allowedModules') > 0
                  THEN pm.data->'allowedModules'
                  ELSE NULL::jsonb
                END,
                CASE
                  WHEN jsonb_typeof(c.data->'memberModuleOverrides'->(pm.id::text)) = 'array'
                       AND jsonb_array_length(c.data->'memberModuleOverrides'->(pm.id::text)) > 0
                  THEN c.data->'memberModuleOverrides'->(pm.id::text)
                  ELSE NULL::jsonb
                END
              ) AS allowed
            ) perms
            WHERE pm.user_id = auth.uid()
              AND pm.contract_id = _contract_id
              AND pm.status = 'ativo'
              AND (
                perms.allowed IS NULL
                OR CASE _module_key
                  WHEN 'commerce' THEN EXISTS (
                    SELECT 1
                    FROM jsonb_array_elements_text(perms.allowed) AS m
                    WHERE m LIKE 'comercio_%'
                  )
                  WHEN 'church_treasury' THEN perms.allowed ? 'igreja_tesouraria'
                  ELSE perms.allowed ? 'igreja_secretaria'
                END
              )
          )
        )
    );
$$;

REVOKE ALL ON FUNCTION platform_private.can_access_module(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION platform_private.can_access_module(text, text) TO authenticated, service_role;
