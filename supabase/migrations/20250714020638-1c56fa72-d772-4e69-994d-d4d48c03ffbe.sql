-- Insert a default admin role for existing users to allow data access
-- This assumes there's at least one user in the system
INSERT INTO public.user_roles (user_id, role, location_access)
SELECT 
  id,
  'admin'::user_role,
  NULL -- NULL means access to all locations
FROM auth.users
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_roles WHERE user_id = auth.users.id
)
LIMIT 1;

-- Also add a trigger to automatically assign manager role to new users if they don't have a role
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign role if user doesn't already have one
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'manager'::user_role);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user role assignment
DROP TRIGGER IF EXISTS on_auth_user_created_assign_role ON auth.users;
CREATE TRIGGER on_auth_user_created_assign_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_default_role();