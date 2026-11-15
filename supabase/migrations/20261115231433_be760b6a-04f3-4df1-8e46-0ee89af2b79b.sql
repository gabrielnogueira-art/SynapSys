DROP POLICY IF EXISTS "system_settings public read" ON public.system_settings;
REVOKE ALL ON public.system_settings FROM anon;
GRANT SELECT ON public.system_settings TO authenticated;
CREATE POLICY "approved users read registration flag" ON public.system_settings FOR SELECT TO authenticated USING (
  key = 'allow_registrations' AND EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = (SELECT auth.uid()))
);