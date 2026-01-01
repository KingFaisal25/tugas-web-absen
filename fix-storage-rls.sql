-- Fix Storage RLS Issues for Supabase Setup
-- Run this SQL in your Supabase SQL Editor or Dashboard

-- 1. Create exec_sql function for administrative operations
CREATE OR REPLACE FUNCTION public.exec_sql(sql text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result json;
BEGIN
    -- Only allow service role to execute this function
    IF auth.role() != 'service_role' THEN
        RAISE EXCEPTION 'Access denied. Only service role can execute this function.';
    END IF;

    -- Execute the SQL
    EXECUTE sql;

    -- Return success
    result := json_build_object('success', true, 'message', 'SQL executed successfully');
    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        result := json_build_object('success', false, 'message', SQLERRM);
        RETURN result;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.exec_sql(text) TO service_role;

-- 2. Temporarily disable RLS on storage.buckets
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- 3. Create the required buckets
INSERT INTO storage.buckets (id, name, public, created_at, updated_at)
VALUES
    ('qr', 'qr', true, NOW(), NOW()),
    ('faces', 'faces', false, NOW(), NOW()),
    ('profiles', 'profiles', true, NOW(), NOW()),
    ('materials', 'materials', true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 4. Re-enable RLS with proper policies
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to view buckets" ON storage.buckets;
DROP POLICY IF EXISTS "Allow service role to manage buckets" ON storage.buckets;

-- Create new policies
CREATE POLICY "Allow authenticated users to view buckets" ON storage.buckets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage buckets" ON storage.buckets
    FOR ALL USING (auth.role() = 'service_role');

-- 5. Also fix storage.objects policies
DROP POLICY IF EXISTS "Allow authenticated users to view objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to manage objects" ON storage.objects;

CREATE POLICY "Allow authenticated users to view objects" ON storage.objects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage objects" ON storage.objects
    FOR ALL USING (auth.role() = 'service_role');

-- Success message
SELECT 'Storage RLS policies fixed and buckets created successfully' as message;
