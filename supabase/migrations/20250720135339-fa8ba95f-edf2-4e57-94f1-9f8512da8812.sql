-- Critical Security Fixes for Database Functions and Role Management

-- Fix 1: Update all database functions to include proper search_path configuration
-- This prevents search path attacks identified in the security review

-- Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Fix is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role = 'admin'::user_role
  );
$$;

-- Fix cleanup_old_security_rounds function
CREATE OR REPLACE FUNCTION public.cleanup_old_security_rounds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Delete security rounds older than 7 days
  DELETE FROM public.security_rounds 
  WHERE created_at < (NOW() - INTERVAL '7 days');
  
  -- Log the cleanup operation (simplified to avoid dependency on non-existent table)
  RAISE LOG 'Cleaned up security_rounds older than 7 days at %', NOW();
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in cleanup_old_security_rounds: %', SQLERRM;
END;
$$;

-- Fix schedule_cleanup_old_security_rounds function
CREATE OR REPLACE FUNCTION public.schedule_cleanup_old_security_rounds()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.cleanup_old_security_rounds();
$$;

-- Fix assign_default_role function
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign role if user doesn't already have one
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = NEW.id) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'manager'::user_role);
  END IF;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE LOG 'Error in assign_default_role: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;

-- Fix 2: Critical Role Management Security - Prevent privilege escalation
-- Remove the existing problematic admin policy that allows recursive access
DROP POLICY IF EXISTS "Admins can manage all roles via function" ON public.user_roles;

-- Create a more secure admin policy that prevents users from updating their own roles
CREATE POLICY "Admins can manage other users roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (
  -- Admins can manage roles, but NOT their own role
  public.is_admin(auth.uid()) AND user_id != auth.uid()
)
WITH CHECK (
  -- Same restriction for inserts/updates
  public.is_admin(auth.uid()) AND user_id != auth.uid()
);

-- Create a separate policy for viewing own role (keep existing functionality)
CREATE POLICY "Users can view own role only"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Fix 3: Create audit logging for role changes (security monitoring)
CREATE TABLE public.role_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  performed_by UUID NOT NULL, -- who made the change
  target_user UUID NOT NULL, -- whose role was changed
  old_role user_role,
  new_role user_role NOT NULL,
  action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs"
ON public.role_audit_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Create audit trigger function for role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (performed_by, target_user, new_role, action)
    VALUES (auth.uid(), NEW.user_id, NEW.role, 'INSERT');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.role_audit_log (performed_by, target_user, old_role, new_role, action)
    VALUES (auth.uid(), NEW.user_id, OLD.role, NEW.role, 'UPDATE');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (performed_by, target_user, old_role, action)
    VALUES (auth.uid(), OLD.user_id, OLD.role, 'DELETE');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Create audit trigger on user_roles table
CREATE TRIGGER audit_user_roles_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_role_changes();

-- Fix 4: Add role change security function for admin operations
CREATE OR REPLACE FUNCTION public.admin_change_user_role(
  target_user_id UUID,
  new_role user_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  
  -- Prevent admins from changing their own role
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Security violation: Cannot modify own role';
  END IF;
  
  -- Update the role
  UPDATE public.user_roles 
  SET role = new_role, updated_at = now()
  WHERE user_id = target_user_id;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in admin_change_user_role: %', SQLERRM;
    RETURN FALSE;
END;
$$;