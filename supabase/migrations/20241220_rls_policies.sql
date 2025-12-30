-- Row Level Security Policies for Academic Platform
-- Comprehensive access control for different user roles

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
-- Students can view their own profile
CREATE POLICY "Students view own profile" ON users
    FOR SELECT USING (
        auth.uid() = id AND 
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'mahasiswa'
        )
    );

-- Lecturers can view their own profile
CREATE POLICY "Lecturers view own profile" ON users
    FOR SELECT USING (
        auth.uid() = id AND 
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'dosen'
        )
    );

-- Admins can view all users
CREATE POLICY "Admins view all users" ON users
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Users can update their own profile
CREATE POLICY "Users update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Courses table policies
-- Students can view courses they are enrolled in
CREATE POLICY "Students view enrolled courses" ON courses
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.course_id = courses.id 
            AND enrollments.student_id = auth.uid()
        )
    );

-- Lecturers can view and manage their own courses
CREATE POLICY "Lecturers manage own courses" ON courses
    FOR ALL USING (
        dosen_id = auth.uid()
    );

-- Enrollments table policies
-- Students can view their own enrollments
CREATE POLICY "Students view own enrollments" ON enrollments
    FOR SELECT USING (
        student_id = auth.uid()
    );

-- Lecturers can view enrollments for their courses
CREATE POLICY "Lecturers view course enrollments" ON enrollments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = enrollments.course_id 
            AND courses.dosen_id = auth.uid()
        )
    );

-- Attendance sessions policies
-- Students can view active sessions for their enrolled courses
CREATE POLICY "Students view active sessions" ON attendance_sessions
    FOR SELECT USING (
        is_active = true AND
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.course_id = attendance_sessions.course_id 
            AND enrollments.student_id = auth.uid()
        )
    );

-- Lecturers can manage sessions for their courses
CREATE POLICY "Lecturers manage own sessions" ON attendance_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = attendance_sessions.course_id 
            AND courses.dosen_id = auth.uid()
        )
    );

-- Attendance logs policies
-- Students can view their own attendance records
CREATE POLICY "Students view own attendance" ON attendance_logs
    FOR SELECT USING (
        student_id = auth.uid()
    );

-- Lecturers can view attendance for their courses
CREATE POLICY "Lecturers view course attendance" ON attendance_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = (
                SELECT course_id FROM attendance_sessions 
                WHERE attendance_sessions.id = attendance_logs.session_id
            ) 
            AND courses.dosen_id = auth.uid()
        )
    );

-- Assignments policies
-- Students can view assignments for their enrolled courses
CREATE POLICY "Students view course assignments" ON assignments
    FOR SELECT USING (
        status = 'published' AND
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.course_id = assignments.course_id 
            AND enrollments.student_id = auth.uid()
        )
    );

-- Lecturers can manage assignments for their courses
CREATE POLICY "Lecturers manage course assignments" ON assignments
    FOR ALL USING (
        created_by = auth.uid()
    );

-- Assignment submissions policies
-- Students can view and create their own submissions
CREATE POLICY "Students manage own submissions" ON assignment_submissions
    FOR ALL USING (
        student_id = auth.uid()
    );

-- Lecturers can view submissions for their assignments
CREATE POLICY "Lecturers view assignment submissions" ON assignment_submissions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_submissions.assignment_id 
            AND assignments.created_by = auth.uid()
        )
    );

-- Lecturers can grade submissions for their assignments
CREATE POLICY "Lecturers grade submissions" ON assignment_submissions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM assignments 
            WHERE assignments.id = assignment_submissions.assignment_id 
            AND assignments.created_by = auth.uid()
        )
    );

-- Notifications policies
-- Users can view their own notifications
CREATE POLICY "Users view own notifications" ON notifications
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications" ON notifications
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- System can create notifications for users
CREATE POLICY "System create notifications" ON notifications
    FOR INSERT WITH CHECK (true);

-- System logs policies
-- Users can view logs related to their activity
CREATE POLICY "Users view own logs" ON system_logs
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Admins can view all system logs
CREATE POLICY "Admins view all logs" ON system_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Grant permissions for all roles
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

GRANT SELECT ON courses TO anon;
GRANT ALL PRIVILEGES ON courses TO authenticated;

GRANT SELECT ON enrollments TO anon;
GRANT ALL PRIVILEGES ON enrollments TO authenticated;

GRANT SELECT ON attendance_sessions TO anon;
GRANT ALL PRIVILEGES ON attendance_sessions TO authenticated;

GRANT SELECT ON attendance_logs TO anon;
GRANT ALL PRIVILEGES ON attendance_logs TO authenticated;

GRANT SELECT ON assignments TO anon;
GRANT ALL PRIVILEGES ON assignments TO authenticated;

GRANT SELECT ON assignment_submissions TO anon;
GRANT ALL PRIVILEGES ON assignment_submissions TO authenticated;

GRANT SELECT ON notifications TO anon;
GRANT ALL PRIVILEGES ON notifications TO authenticated;

GRANT SELECT ON system_logs TO anon;
GRANT ALL PRIVILEGES ON system_logs TO authenticated;