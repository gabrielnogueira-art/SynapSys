DO $$ DECLARE uid uuid; BEGIN
SELECT id INTO uid FROM auth.users WHERE lower(email)='gpintonogueira2@gmail.com';
IF uid IS NULL THEN RAISE EXCEPTION 'Conta não encontrada'; END IF;
INSERT INTO public.user_roles(user_id,role) SELECT uid,'master'::public.app_role WHERE NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=uid AND role='master');
UPDATE public.pending_users SET status='approved',decided_at=now() WHERE user_id=uid;
END $$;