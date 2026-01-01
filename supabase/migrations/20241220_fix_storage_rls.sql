-- Fix Storage Bucket RLS Policies
-- Allow service role to manage storage buckets

-- Disable RLS on storage.buckets to allow service role operations
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Re-enable RLS with proper policies if needed
-- ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view buckets
-- CREATE POLICY "Allow authenticated users to view buckets" ON storage.buckets
--     FOR SELECT USING (auth.role() = 'authenticated');

-- Create policy for service role to manage buckets
-- CREATE POLICY "Allow service role to manage buckets" ON storage.buckets
--     FOR ALL USING (auth.role() = 'service_role');
