-- Update security_rounds table to support 4 QR codes
ALTER TABLE public.security_rounds 
ADD COLUMN qr_code_corner_1 TEXT,
ADD COLUMN qr_code_corner_2 TEXT,
ADD COLUMN qr_code_corner_3 TEXT,
ADD COLUMN qr_code_corner_4 TEXT;

-- Create user roles table for managers
CREATE TYPE public.user_role AS ENUM ('security_guard', 'manager', 'admin');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role user_role NOT NULL DEFAULT 'security_guard',
  location_access TEXT[], -- Array of locations the manager can access
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_roles
CREATE POLICY "Users can view own role" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS user_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;

-- Update security_rounds policies to allow managers to view data
DROP POLICY IF EXISTS "Users can view own rounds" ON public.security_rounds;

CREATE POLICY "Users can view accessible rounds" 
ON public.security_rounds 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('manager', 'admin')
    AND (location_access IS NULL OR location = ANY(location_access))
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();