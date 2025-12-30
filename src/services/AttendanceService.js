const supabase = require('../config/supabase');
const crypto = require('crypto');

class AttendanceService {
  
  // Dosen creates a session
  async createSession(courseId, durationMinutes) {
    const sessionToken = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + durationMinutes * 60000);
    
    const { data, error } = await supabase
      .from('attendance_sessions')
      .insert([{
        course_id: courseId,
        session_token: sessionToken,
        expires_at: expiresAt.toISOString(),
        is_active: true
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // Student scans QR
  async recordAttendance(studentId, sessionToken) {
    // 1. Validate Session
    const { data: session, error: sessionError } = await supabase
      .from('attendance_sessions')
      .select('*')
      .eq('session_token', sessionToken)
      .single();

    if (sessionError || !session) throw new Error("Invalid Session");
    
    if (new Date() > new Date(session.expires_at)) {
      throw new Error("Session Expired");
    }

    // 2. Check Double Entry
    const { data: existing } = await supabase
      .from('attendance_logs')
      .select('*')
      .eq('session_id', session.id)
      .eq('student_id', studentId)
      .single();

    if (existing) throw new Error("Already scanned");

    // 3. Record Log
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert([{
        session_id: session.id,
        student_id: studentId,
        status: 'present',
        scanned_at: new Date().toISOString()
      }])
      .select();

    if (error) throw error;
    return { success: true, message: "Attendance Recorded" };
  }
}

module.exports = new AttendanceService();
