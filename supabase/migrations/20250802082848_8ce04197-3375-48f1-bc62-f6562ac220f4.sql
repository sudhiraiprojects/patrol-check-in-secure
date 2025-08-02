-- Remove the correct audit trigger
DROP TRIGGER audit_user_roles_changes ON public.user_roles;

-- Insert admin roles without the audit trigger
INSERT INTO public.user_roles (user_id, role) VALUES 
('5af0f570-802d-42fb-a3fe-f51de7d80f48', 'admin'),
('39a3d8cb-4c04-4610-a834-4a30ba653811', 'admin'),
('f464b430-ad8f-44e1-a58d-3c126a3a9e20', 'manager')
ON CONFLICT (user_id) DO UPDATE SET role = EXCLUDED.role;

-- Re-create the audit trigger
CREATE TRIGGER audit_user_roles_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_role_changes();