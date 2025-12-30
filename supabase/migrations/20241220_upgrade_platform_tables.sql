-- Upgrade existing database schema to match new platform requirements
-- Migration: 20241220_upgrade_platform_tables

-- Add missing columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS student_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS profile_image TEXT,
ADD COLUMN IF NOT EXISTS angkatan INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Rename existing columns to match new schema
ALTER TABLE public.users 
RENAME COLUMN npm TO student_id,
RENAME COLUMN phone TO phone_number,
RENAME COLUMN photo_url TO profile_image,
RENAME COLUMN nidn TO employee_id;

-- Update courses table to match new schema
ALTER TABLE public.courses
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS credits INTEGER CHECK (credits > 0 AND credits <= 6),
ADD COLUMN IF NOT EXISTS semester INTEGER CHECK (semester >= 1 AND semester <= 8),
ADD COLUMN IF NOT EXISTS program_studi TEXT,
ADD COLUMN IF NOT EXISTS class_schedule JSONB,
ADD COLUMN IF NOT EXISTS room TEXT,
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Rename dosen_id to lecturer_id
ALTER TABLE public.courses
RENAME COLUMN dosen_id TO lecturer_id;

-- Rename enrollments to course_enrollments and add status column
ALTER TABLE public.enrollments
RENAME TO course_enrollments;

ALTER TABLE public.course_enrollments
ADD COLUMN IF NOT EXISTS enrollment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'dropped', 'completed'));

-- Update attendance_sessions table
ALTER TABLE public.attendance_sessions
RENAME COLUMN session_token TO qr_code,
RENAME COLUMN expires_at TO qr_expires_at,
RENAME COLUMN is_active TO status;

ALTER TABLE public.attendance_sessions
ADD COLUMN IF NOT EXISTS session_date DATE,
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS radius_meters INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update attendance_logs to attendance_records
ALTER TABLE public.attendance_logs
RENAME TO attendance_records;

ALTER TABLE public.attendance_records
RENAME COLUMN scanned_at TO attendance_time;

ALTER TABLE public.attendance_records
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_accuracy DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS validation_method TEXT DEFAULT 'qr' CHECK (validation_method IN ('qr', 'manual')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update status column to include more options
ALTER TABLE public.attendance_records
ALTER COLUMN status TYPE TEXT,
ALTER COLUMN status SET DEFAULT 'present',
ADD CONSTRAINT attendance_records_status_check CHECK (status IN ('present', 'late', 'absent', 'excused'));

-- Create assignments table if not exists
CREATE TABLE IF NOT EXISTS public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    instructions TEXT,
    max_score INTEGER DEFAULT 100,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    allow_late_submission BOOLEAN DEFAULT false,
    late_penalty_per_day DECIMAL(5, 2) DEFAULT 0,
    submission_type TEXT DEFAULT 'file' CHECK (submission_type IN ('file', 'text', 'url', 'multiple')),
    max_file_size_mb INTEGER DEFAULT 10,
    allowed_file_types TEXT[] DEFAULT ARRAY['pdf', 'doc', 'docx', 'txt'],
    rubric JSONB,
    created_by UUID REFERENCES public.users(id),
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create assignment_submissions table if not exists
CREATE TABLE IF NOT EXISTS public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    submission_text TEXT,
    file_urls TEXT[],
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    score INTEGER,
    feedback TEXT,
    graded_by UUID REFERENCES public.users(id),
    graded_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted', 'graded', 'returned', 'late')),
    is_late BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(assignment_id, student_id)
);

-- Create notifications table if not exists
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('assignment', 'attendance', 'deadline', 'announcement', 'system')),
    related_id UUID,
    related_type TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system_logs table if not exists
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users(student_id);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id);
CREATE INDEX IF NOT EXISTS idx_courses_lecturer ON public.courses(lecturer_id);
CREATE INDEX IF NOT EXISTS idx_courses_code ON public.courses(code);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_student ON public.course_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON public.course_enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_course ON public.attendance_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_qr ON public.attendance_sessions(qr_code);
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_expires ON public.attendance_sessions(qr_expires_at);
CREATE INDEX IF NOT EXISTS idx_attendance_records_session ON public.attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON public.attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON public.attendance_records(attendance_time);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON public.assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON public.assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_system_logs_user ON public.system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_resource ON public.system_logs(resource_type, resource_id);

-- Update RLS policies for existing tables
-- Users policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
DROP POLICY IF EXISTS "Lecturers can view enrolled students" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Lecturers can view enrolled students" ON public.users
    FOR SELECT USING (
        role = 'mahasiswa' AND 
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE lecturer_id = auth.uid() 
            AND EXISTS (
                SELECT 1 FROM public.course_enrollments 
                WHERE student_id = users.id 
                AND course_id = courses.id
            )
        )
    );

-- Courses policies
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "All authenticated users can view published courses" ON public.courses;
DROP POLICY IF EXISTS "Lecturers can manage their own courses" ON public.courses;
DROP POLICY IF EXISTS "Admin can manage all courses" ON public.courses;

CREATE POLICY "All authenticated users can view published courses" ON public.courses
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Lecturers can manage their own courses" ON public.courses
    FOR ALL USING (lecturer_id = auth.uid());
CREATE POLICY "Admin can manage all courses" ON public.courses
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Course enrollments policies
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can view their own enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Lecturers can view course enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;

CREATE POLICY "Students can view their own enrollments" ON public.course_enrollments
    FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Lecturers can view course enrollments" ON public.course_enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE id = course_enrollments.course_id 
            AND lecturer_id = auth.uid()
        )
    );
CREATE POLICY "Students can enroll in courses" ON public.course_enrollments
    FOR INSERT WITH CHECK (student_id = auth.uid());

-- Attendance sessions policies
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecturers can manage their course sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Students can view active sessions" ON public.attendance_sessions;

CREATE POLICY "Lecturers can manage their course sessions" ON public.attendance_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE id = attendance_sessions.course_id 
            AND lecturer_id = auth.uid()
        )
    );
CREATE POLICY "Students can view active sessions" ON public.attendance_sessions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.course_enrollments 
            WHERE student_id = auth.uid() 
            AND course_id = attendance_sessions.course_id
            AND status = 'active'
        )
        AND status = 'active'
        AND qr_expires_at > NOW()
    );

-- Attendance records policies
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can create their attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can view their own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Lecturers can view course attendance" ON public.attendance_records;

CREATE POLICY "Students can create their attendance records" ON public.attendance_records
    FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students can view their own attendance" ON public.attendance_records
    FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Lecturers can view course attendance" ON public.attendance_records
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.attendance_sessions 
            JOIN public.courses ON courses.id = attendance_sessions.course_id
            WHERE attendance_sessions.id = attendance_records.session_id 
            AND courses.lecturer_id = auth.uid()
        )
    );

-- Assignments policies
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lecturers can manage their course assignments" ON public.assignments;
DROP POLICY IF EXISTS "Students can view published assignments" ON public.assignments;

CREATE POLICY "Lecturers can manage their course assignments" ON public.assignments
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.courses 
            WHERE id = assignments.course_id 
            AND lecturer_id = auth.uid()
        )
    );
CREATE POLICY "Students can view published assignments" ON public.assignments
    FOR SELECT USING (
        status = 'published' AND 
        EXISTS (
            SELECT 1 FROM public.course_enrollments 
            WHERE student_id = auth.uid() 
            AND course_id = assignments.course_id
            AND status = 'active'
        )
    );

-- Assignment submissions policies
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Students can manage their submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Lecturers can view course submissions" ON public.assignment_submissions;
DROP POLICY IF EXISTS "Lecturers can grade submissions" ON public.assignment_submissions;

CREATE POLICY "Students can manage their submissions" ON public.assignment_submissions
    FOR ALL USING (student_id = auth.uid());
CREATE POLICY "Lecturers can view course submissions" ON public.assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.assignments 
            JOIN public.courses ON courses.id = assignments.course_id
            WHERE assignments.id = assignment_submissions.assignment_id 
            AND courses.lecturer_id = auth.uid()
        )
    );
CREATE POLICY "Lecturers can grade submissions" ON public.assignment_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.assignments 
            JOIN public.courses ON courses.id = assignments.course_id
            WHERE assignments.id = assignment_submissions.assignment_id 
            AND courses.lecturer_id = auth.uid()
        )
    );

-- Notifications policies
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

CREATE POLICY "Users can view their notifications" ON public.notifications
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update their notifications" ON public.notifications
    FOR UPDATE USING (user_id = auth.uid());

-- System logs policies
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own logs" ON public.system_logs;
DROP POLICY IF EXISTS "Admin can view all logs" ON public.system_logs;

CREATE POLICY "Users can view their own logs" ON public.system_logs
    FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admin can view all logs" ON public.system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions to roles
GRANT SELECT ON public.users TO anon;
GRANT SELECT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT ON public.course_enrollments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_enrollments TO authenticated;
GRANT SELECT ON public.attendance_sessions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attendance_records TO anon;
GRANT SELECT, INSERT, UPDATE ON public.attendance_records TO authenticated;
GRANT SELECT ON public.assignments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.assignment_submissions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.assignment_submissions TO authenticated;
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT ON public.system_logs TO authenticated;

-- Functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_courses_updated_at ON public.courses;
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON public.courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignments_updated_at ON public.assignments;
CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_assignment_submissions_updated_at ON public.assignment_submissions;
CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'role');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();