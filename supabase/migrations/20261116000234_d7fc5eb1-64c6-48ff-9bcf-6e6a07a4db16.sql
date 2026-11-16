DO $$
DECLARE
  v_user uuid;
  v_cong uuid;
  v_hq uuid;
  v_min uuid;
  v_reg uuid;
  v_other uuid := '00000000-0000-4000-8000-000000000001';
BEGIN
  SELECT user_id INTO v_user FROM public.user_roles WHERE role = 'master' LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Security test requires an existing master role'; END IF;
  SELECT congregation_id INTO v_cong FROM public.user_roles WHERE user_id = v_user ORDER BY created_at ASC LIMIT 1;
  SELECT headquarters_id INTO v_hq FROM public.user_roles WHERE user_id = v_user AND headquarters_id IS NOT NULL LIMIT 1;
  SELECT ministry_id INTO v_min FROM public.user_roles WHERE user_id = v_user AND ministry_id IS NOT NULL LIMIT 1;
  SELECT regional_id INTO v_reg FROM public.user_roles WHERE user_id = v_user AND regional_id IS NOT NULL LIMIT 1;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_other,'role','authenticated')::text, true);
  EXECUTE 'SET LOCAL ROLE authenticated';
  IF public.get_user_congregation(v_user) IS NOT NULL OR public.get_user_headquarters(v_user) IS NOT NULL OR public.get_user_ministry(v_user) IS NOT NULL OR public.get_user_regional(v_user) IS NOT NULL THEN
    RAISE EXCEPTION 'Cross-user affiliation disclosure';
  END IF;
  IF public.has_role(v_user,'master') OR public.user_can_delete_headquarters(v_user,v_other) OR public.user_can_delete_regional(v_user,v_other) OR public.user_can_manage_congregation_structure(v_user,v_other) THEN
    RAISE EXCEPTION 'Cross-user permission disclosure';
  END IF;
  PERFORM set_config('request.jwt.claims', json_build_object('sub',v_user,'role','authenticated')::text, true);
  IF public.get_user_congregation(v_user) IS DISTINCT FROM v_cong OR public.get_user_headquarters(v_user) IS DISTINCT FROM v_hq OR public.get_user_ministry(v_user) IS DISTINCT FROM v_min OR public.get_user_regional(v_user) IS DISTINCT FROM v_reg THEN
    RAISE EXCEPTION 'Own affiliations regression';
  END IF;
  IF NOT public.has_role(v_user,'master') OR NOT public.user_can_delete_headquarters(v_user,v_other) OR NOT public.user_can_delete_regional(v_user,v_other) OR NOT public.user_can_manage_congregation_structure(v_user,v_other) THEN
    RAISE EXCEPTION 'Own master permissions regression';
  END IF;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
  EXECUTE 'SET LOCAL ROLE service_role';
  IF public.get_user_congregation(v_user) IS DISTINCT FROM v_cong OR public.get_user_headquarters(v_user) IS DISTINCT FROM v_hq OR public.get_user_ministry(v_user) IS DISTINCT FROM v_min OR public.get_user_regional(v_user) IS DISTINCT FROM v_reg OR NOT public.has_role(v_user,'master') OR NOT public.user_can_delete_headquarters(v_user,v_other) OR NOT public.user_can_delete_regional(v_user,v_other) OR NOT public.user_can_manage_congregation_structure(v_user,v_other) THEN
    RAISE EXCEPTION 'Protected administrative workflow regression';
  END IF;
  EXECUTE 'RESET ROLE';
  PERFORM set_config('request.jwt.claims','{}',true);
END;
$$;