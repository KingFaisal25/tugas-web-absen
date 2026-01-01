-- Create exec_sql function for administrative operations
-- This function allows executing raw SQL commands

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

-- Fix Storage RLS Issues
-- Disable RLS on storage.buckets to allow bucket management
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Create storage policies for buckets
CREATE POLICY "Allow authenticated users to view buckets" ON storage.buckets
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage buckets" ON storage.buckets
    FOR ALL USING (auth.role() = 'service_role');

-- Re-enable RLS
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create storage policies for objects
DROP POLICY IF EXISTS "Allow authenticated users to view objects" ON storage.objects;
DROP POLICY IF EXISTS "Allow service role to manage objects" ON storage.objects;

CREATE POLICY "Allow authenticated users to view objects" ON storage.objects
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow service role to manage objects" ON storage.objects
    FOR ALL USING (auth.role() = 'service_role');
