ALTER TABLE public.pending_users
  ADD COLUMN IF NOT EXISTS contract_id text REFERENCES public.platform_contracts(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS requested_area text,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS pending_users_contract_status_idx
  ON public.pending_users (contract_id, status);

DROP POLICY IF EXISTS "contract manager read own pending" ON public.pending_users;
CREATE POLICY "contract manager read own pending"
  ON public.pending_users
  FOR SELECT
  TO authenticated
  USING (
    contract_id IS NOT NULL
    AND platform_private.platform_can_access(contract_id, true)
  );

CREATE OR REPLACE FUNCTION public.handle_new_user_pending()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contract_id text;
BEGIN
  SELECT pc.id INTO v_contract_id
  FROM public.platform_contracts pc
  WHERE pc.id = NULLIF(NEW.raw_user_meta_data->>'contract_id', '')
  LIMIT 1;

  INSERT INTO public.pending_users (
    user_id,
    email,
    display_name,
    contract_id,
    requested_area,
    notes,
    status
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', NEW.email),
    v_contract_id,
    NULLIF(NEW.raw_user_meta_data->>'requested_area', ''),
    NULLIF(NEW.raw_user_meta_data->>'notes', ''),
    'pending'
  )
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;
