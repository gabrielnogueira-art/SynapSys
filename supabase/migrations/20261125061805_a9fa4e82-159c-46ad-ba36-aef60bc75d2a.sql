CREATE OR REPLACE FUNCTION public.is_master(_user_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role::text = 'master');
END; $$;

CREATE OR REPLACE FUNCTION public.user_can_see_congregation(_user_id uuid, _congregation_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN public.is_master(_user_id)
    OR EXISTS (SELECT 1 FROM public.congregations c JOIN public.headquarters h ON h.id = c.headquarters_id
      WHERE c.id = _congregation_id AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_mae' AND ur.ministry_id = h.ministry_id))
    OR EXISTS (SELECT 1 FROM public.congregations c WHERE c.id = _congregation_id
      AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_sede' AND ur.headquarters_id = c.headquarters_id))
    OR EXISTS (SELECT 1 FROM public.congregations c WHERE c.id = _congregation_id AND c.regional_id IS NOT NULL
      AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'admin_regional' AND ur.regional_id = c.regional_id))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'secretario_ebd' AND ur.congregation_id = _congregation_id);
END; $$;

CREATE OR REPLACE FUNCTION public.user_can_see_headquarters(_user_id uuid, _headquarters_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN public.is_master(_user_id)
    OR EXISTS (SELECT 1 FROM public.headquarters h WHERE h.id = _headquarters_id
      AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_mae' AND ur.ministry_id = h.ministry_id))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_sede' AND ur.headquarters_id = _headquarters_id)
    OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.regionals r ON r.id = ur.regional_id
      WHERE ur.user_id = _user_id AND ur.role = 'admin_regional' AND r.headquarters_id = _headquarters_id)
    OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.congregations c ON c.id = ur.congregation_id
      WHERE ur.user_id = _user_id AND ur.role = 'secretario_ebd' AND c.headquarters_id = _headquarters_id);
END; $$;

CREATE OR REPLACE FUNCTION public.user_can_see_ministry(_user_id uuid, _ministry_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN public.is_master(_user_id)
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_mae' AND ur.ministry_id = _ministry_id)
    OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.headquarters h ON h.id = ur.headquarters_id
      WHERE ur.user_id = _user_id AND ur.role = 'igreja_sede' AND h.ministry_id = _ministry_id)
    OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.regionals r ON r.id = ur.regional_id JOIN public.headquarters h ON h.id = r.headquarters_id
      WHERE ur.user_id = _user_id AND ur.role = 'admin_regional' AND h.ministry_id = _ministry_id)
    OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.congregations c ON c.id = ur.congregation_id JOIN public.headquarters h ON h.id = c.headquarters_id
      WHERE ur.user_id = _user_id AND ur.role = 'secretario_ebd' AND h.ministry_id = _ministry_id);
END; $$;

CREATE OR REPLACE FUNCTION public.user_can_see_regional(_user_id uuid, _regional_id uuid)
 RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN public.is_master(_user_id)
    OR EXISTS (SELECT 1 FROM public.regionals r JOIN public.headquarters h ON h.id = r.headquarters_id
      WHERE r.id = _regional_id AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_mae' AND ur.ministry_id = h.ministry_id))
    OR EXISTS (SELECT 1 FROM public.regionals r WHERE r.id = _regional_id
      AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_sede' AND ur.headquarters_id = r.headquarters_id))
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'admin_regional' AND ur.regional_id = _regional_id)
    OR EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.congregations c ON c.id = ur.congregation_id
      WHERE ur.user_id = _user_id AND ur.role = 'secretario_ebd' AND c.regional_id = _regional_id);
END; $$;

REVOKE EXECUTE ON FUNCTION public.is_master(uuid), public.user_can_see_congregation(uuid,uuid), public.user_can_see_headquarters(uuid,uuid), public.user_can_see_ministry(uuid,uuid), public.user_can_see_regional(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_master(uuid), public.user_can_see_congregation(uuid,uuid), public.user_can_see_headquarters(uuid,uuid), public.user_can_see_ministry(uuid,uuid), public.user_can_see_regional(uuid,uuid) TO authenticated, service_role;

-- Invalida senhas fixas das contas de teste e do master antigo
UPDATE auth.users
SET encrypted_password = extensions.crypt(gen_random_uuid()::text || gen_random_uuid()::text, extensions.gen_salt('bf'))
WHERE email IN ('master@ebd.dev','admin_ministerio@teste.com','admin_igreja_mae@teste.com','admin_regional@teste.com','admin_congregacao@teste.com','professor_classe@teste.com');