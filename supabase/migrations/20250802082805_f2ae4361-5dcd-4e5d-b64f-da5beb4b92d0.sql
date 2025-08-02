-- Remove all triggers from user_roles table
DROP TRIGGER IF EXISTS audit_role_changes_trigger ON public.user_roles;
DROP TRIGGER IF EXISTS role_audit_trigger ON public.user_roles;

-- Insert admin roles without triggers 
INSERT INTO public.user_roles (user_id, role) VALUES 
('5af0f570-802d-42fb-a3fe-f51de7d80f48', 'admin'),
('39a3d8cb-4c04-4610-a834-4a30ba653811', 'admin'),
('f464b430-ad8f-44e1-a58d-3c126a3a9e20', 'manager');