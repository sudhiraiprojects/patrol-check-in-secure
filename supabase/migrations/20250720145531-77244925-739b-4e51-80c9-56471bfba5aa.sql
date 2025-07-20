-- Add unique constraint to user_roles table and assign admin role
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_unique UNIQUE (user_id);

-- Now assign admin role to current user
INSERT INTO public.user_roles (user_id, role) 
VALUES (auth.uid(), 'admin'::user_role)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;