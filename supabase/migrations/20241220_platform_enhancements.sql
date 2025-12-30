-- Platform Academic Enhancements Migration
-- Adding missing tables and columns for comprehensive academic platform

-- Add missing columns to existing tables
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS face_descriptor TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
ADD COLUMN IF NOT EXISTS program_studi VARCHAR(100),
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add semester column to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS semester VARCHAR(10);

-- Enhance attendance_logs table with GPS coordinates
ALTER TABLE attendance_logs 
ADD COLUMN IF NOT EXISTS location_lat FLOAT,
ADD COLUMN IF NOT EXISTS location_lng FLOAT,
ADD COLUMN IF NOT EXISTS qr_code_data VARCHAR(500);

-- Add GPS location to attendance_sessions
ALTER TABLE attendance_sessions 
ADD COLUMN IF NOT EXISTS location_lat FLOAT,
ADD COLUMN IF NOT EXISTS location_lng FLOAT,
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 50;

-- Add submission type and file constraints to assignments
ALTER TABLE assignments 
ADD COLUMN IF NOT EXISTS submission_type VARCHAR(20) DEFAULT 'file' 
    CHECK (submission_type IN ('file', 'text', 'url', 'multiple')),
ADD COLUMN IF NOT EXISTS max_file_size_mb INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt'],
ADD COLUMN IF NOT EXISTS instructions TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' 
    CHECK (status IN ('draft', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add file URLs array to assignment_submissions
ALTER TABLE assignment_submissions 
ADD COLUMN IF NOT EXISTS file_urls TEXT[],
ADD COLUMN IF NOT EXISTS submission_text TEXT,
ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_is_verified ON users(is_verified);
CREATE INDEX IF NOT EXISTS idx_users_program_studi ON users(program_studi);
CREATE INDEX IF NOT EXISTS idx_courses_semester ON courses(semester);
CREATE INDEX IF NOT EXISTS idx_attendance_logs_location ON attendance_logs(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_location ON attendance_sessions(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignments_submission_type ON assignments(submission_type);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_is_late ON assignment_submissions(is_late);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_assignments_updated_at ON assignments;
CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at
    BEFORE UPDATE ON assignment_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions for new columns
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

GRANT SELECT ON courses TO anon;
GRANT ALL PRIVILEGES ON courses TO authenticated;

GRANT SELECT ON attendance_sessions TO anon;
GRANT ALL PRIVILEGES ON attendance_sessions TO authenticated;

GRANT SELECT ON attendance_logs TO anon;
GRANT ALL PRIVILEGES ON attendance_logs TO authenticated;

GRANT SELECT ON assignments TO anon;
GRANT ALL PRIVILEGES ON assignments TO authenticated;

GRANT SELECT ON assignment_submissions TO anon;
GRANT ALL PRIVILEGES ON assignment_submissions TO authenticated;