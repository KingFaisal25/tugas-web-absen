-- Manual Bucket Creation for Supabase
-- Run these commands ONE BY ONE in Supabase SQL Editor

-- 1. First, let's check if we can create buckets using the storage API
-- This should work if you have proper permissions

-- Note: If you get permission errors, create buckets manually in Supabase Dashboard:
-- Go to Storage → Create bucket with these names:
-- - qr (public)
-- - faces (private)
-- - profiles (public)
-- - materials (public)

-- Alternative: Use the REST API to create buckets
-- But first, let's try to fix the RLS issue

-- Check current RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'storage' AND tablename = 'buckets';

-- If RLS is enabled, we need to work around it
-- The proper way is to use Supabase Dashboard or API calls

-- For now, let's create a simple function to check bucket existence
CREATE OR REPLACE FUNCTION check_bucket_exists(bucket_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    bucket_count integer;
BEGIN
    SELECT COUNT(*) INTO bucket_count
    FROM storage.buckets
    WHERE id = bucket_name;

    RETURN bucket_count > 0;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_bucket_exists(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_bucket_exists(text) TO anon;
