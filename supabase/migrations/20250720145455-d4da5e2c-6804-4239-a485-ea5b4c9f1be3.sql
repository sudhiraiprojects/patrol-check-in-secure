-- Assign admin role to current user so they can see all security rounds data
INSERT INTO public.user_roles (user_id, role) 
VALUES (auth.uid(), 'admin'::user_role)
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;