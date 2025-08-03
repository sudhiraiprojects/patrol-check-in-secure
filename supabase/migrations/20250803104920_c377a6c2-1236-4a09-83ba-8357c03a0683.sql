-- Ensure the storage bucket exists (it might have been created but not accessible)
INSERT INTO storage.buckets (id, name, public) VALUES ('security-photos', 'security-photos', false)
ON CONFLICT (id) DO NOTHING;

-- Update existing RLS policies to allow managers and admins to view all photos
DROP POLICY IF EXISTS "Authenticated users can view their own photos" ON storage.objects;
CREATE POLICY "Users can view accessible photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'security-photos' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('manager', 'admin')
    )
  )
);

-- Add admin-specific functions
CREATE OR REPLACE FUNCTION public.is_manager_or_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = user_uuid AND role IN ('manager', 'admin')
  );
$function$;