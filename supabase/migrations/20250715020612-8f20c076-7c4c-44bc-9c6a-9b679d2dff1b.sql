-- Create a function to clean up old security rounds data (7-day retention)
CREATE OR REPLACE FUNCTION public.cleanup_old_security_rounds()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete security rounds older than 7 days
  DELETE FROM public.security_rounds 
  WHERE created_at < (NOW() - INTERVAL '7 days');
  
  -- Log the cleanup operation
  INSERT INTO postgres_log (message) 
  VALUES ('Cleaned up security_rounds older than 7 days at ' || NOW());
EXCEPTION
  WHEN OTHERS THEN
    -- If logging table doesn't exist, just continue
    NULL;
END;
$$;

-- Create a function to be called by pg_cron for automatic cleanup
CREATE OR REPLACE FUNCTION public.schedule_cleanup_old_security_rounds()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT public.cleanup_old_security_rounds();
$$;

-- Enable the pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup to run daily at 2 AM
SELECT cron.schedule(
  'cleanup-old-security-rounds',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT public.schedule_cleanup_old_security_rounds();'
);