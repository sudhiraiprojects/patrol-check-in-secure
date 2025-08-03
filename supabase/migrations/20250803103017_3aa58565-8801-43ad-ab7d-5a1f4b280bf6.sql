-- Create storage bucket for security round photos
INSERT INTO storage.buckets (id, name, public) VALUES ('security-photos', 'security-photos', false);

-- Create storage policies for security photos
CREATE POLICY "Authenticated users can view their own photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'security-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can upload their own photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'security-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can update their own photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'security-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Authenticated users can delete their own photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'security-photos' AND auth.uid()::text = (storage.foldername(name))[1]);