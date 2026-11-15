CREATE OR REPLACE FUNCTION public.get_user_congregation(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT congregation_id FROM public.user_roles
  WHERE user_id = _user_id
    AND ((auth.uid() IS NOT NULL AND _user_id = auth.uid()) OR auth.role() = 'service_role')
  ORDER BY created_at ASC LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_headquarters(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT headquarters_id FROM public.user_roles
  WHERE user_id = _user_id AND headquarters_id IS NOT NULL
    AND ((auth.uid() IS NOT NULL AND _user_id = auth.uid()) OR auth.role() = 'service_role')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_ministry(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT ministry_id FROM public.user_roles
  WHERE user_id = _user_id AND ministry_id IS NOT NULL
    AND ((auth.uid() IS NOT NULL AND _user_id = auth.uid()) OR auth.role() = 'service_role')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_regional(_user_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT regional_id FROM public.user_roles
  WHERE user_id = _user_id AND regional_id IS NOT NULL
    AND ((auth.uid() IS NOT NULL AND _user_id = auth.uid()) OR auth.role() = 'service_role')
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_delete_headquarters(_user_id uuid, _headquarters_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN public.is_master(_user_id) OR EXISTS (
    SELECT 1 FROM public.headquarters h
    WHERE h.id = _headquarters_id AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = _user_id AND ur.role = 'igreja_mae' AND ur.ministry_id = h.ministry_id
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_delete_regional(_user_id uuid, _regional_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN public.is_master(_user_id) OR EXISTS (
    SELECT 1 FROM public.regionals r JOIN public.headquarters h ON h.id = r.headquarters_id
    WHERE r.id = _regional_id AND (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_mae' AND ur.ministry_id = h.ministry_id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_sede' AND ur.headquarters_id = h.id)
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_congregation_structure(_user_id uuid, _congregation_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT (COALESCE(auth.uid() IS NOT NULL AND _user_id = auth.uid(), false) OR COALESCE(auth.role() = 'service_role', false)) THEN
    RETURN false;
  END IF;
  RETURN public.is_master(_user_id) OR EXISTS (
    SELECT 1 FROM public.congregations c JOIN public.headquarters h ON h.id = c.headquarters_id
    WHERE c.id = _congregation_id AND (
      EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_mae' AND ur.ministry_id = h.ministry_id)
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'igreja_sede' AND ur.headquarters_id = h.id)
      OR (c.regional_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'admin_regional' AND ur.regional_id = c.regional_id))
      OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role = 'secretario_ebd' AND ur.congregation_id = c.id)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_congregation(uuid), public.get_user_headquarters(uuid), public.get_user_ministry(uuid), public.get_user_regional(uuid), public.has_role(uuid, public.app_role), public.user_can_delete_headquarters(uuid, uuid), public.user_can_delete_regional(uuid, uuid), public.user_can_manage_congregation_structure(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_congregation(uuid), public.get_user_headquarters(uuid), public.get_user_ministry(uuid), public.get_user_regional(uuid), public.has_role(uuid, public.app_role), public.user_can_delete_headquarters(uuid, uuid), public.user_can_delete_regional(uuid, uuid), public.user_can_manage_congregation_structure(uuid, uuid) TO authenticated, service_role;