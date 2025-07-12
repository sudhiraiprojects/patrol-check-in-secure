-- Add missing RLS policies for security_rounds table
CREATE POLICY "Users can update own rounds" 
ON public.security_rounds 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own rounds" 
ON public.security_rounds 
FOR DELETE 
USING (auth.uid() = user_id);