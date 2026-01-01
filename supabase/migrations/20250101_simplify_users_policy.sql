-- Simplify users table RLS policies to prevent recursion and role mismatch issues
-- This ensures the fallback login mechanism works reliably

-- Drop existing complex policies
DROP POLICY IF EXISTS "Students view own profile" ON users;
DROP POLICY IF EXISTS "Lecturers view own profile" ON users;
DROP POLICY IF EXISTS "Admins view all users" ON users;

-- Create unified simple policy for viewing own profile
CREATE POLICY "Users view own profile" ON users
    FOR SELECT USING (
        auth.uid() = id
    );

-- Re-create Admin policy (separate because it allows viewing ALL users)
CREATE POLICY "Admins view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );
