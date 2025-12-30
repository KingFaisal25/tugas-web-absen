import { supabase } from '../config/supabase.ts'
import type { AttendanceSession, AttendanceLog } from '../config/supabase.ts'

export interface AttendanceData {
  sessionId: string
  studentId: string
  locationLat: number
  locationLng: number
  qrCodeData: string
}

export interface CreateSessionData {
  courseId: string
  expiresAt: string
  locationLat: number
  locationLng: number
  radiusMeters?: number
}

class AttendanceService {
  async createSession(data: CreateSessionData): Promise<{ session: AttendanceSession | null; error: string | null }> {
    try {
      const sessionToken = this.generateSessionToken()
      
      const { data: session, error } = await supabase
        .from('attendance_sessions')
        .insert({
          course_id: data.courseId,
          session_token: sessionToken,
          expires_at: data.expiresAt,
          location_lat: data.locationLat,
          location_lng: data.locationLng,
          radius_meters: data.radiusMeters || 50,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      return { session, error: null }
    } catch (error: any) {
      return { session: null, error: error.message || 'Gagal membuat sesi absensi' }
    }
  }

  async submitAttendance(data: AttendanceData): Promise<{ log: AttendanceLog | null; error: string | null }> {
    try {
      // Validate session
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('id', data.sessionId)
        .eq('is_active', true)
        .single()

      if (sessionError || !session) {
        return { log: null, error: 'Sesi absensi tidak valid atau sudah berakhir' }
      }

      // Check if session has expired
      if (new Date() > new Date(session.expires_at)) {
        return { log: null, error: 'Sesi absensi sudah berakhir' }
      }

      // Validate location if GPS is required
      if (session.location_lat && session.location_lng) {
        const distance = this.calculateDistance(
          data.locationLat,
          data.locationLng,
          session.location_lat,
          session.location_lng
        )

        if (distance > (session.radius_meters || 50)) {
          return { log: null, error: 'Lokasi tidak valid. Anda terlalu jauh dari lokasi perkuliahan.' }
        }
      }

      // Check if student is already enrolled in the course
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('course_id', session.course_id)
        .eq('student_id', data.studentId)
        .single()

      if (enrollmentError || !enrollment) {
        return { log: null, error: 'Anda tidak terdaftar dalam mata kuliah ini' }
      }

      // Check if student has already attended this session
      const { data: existingLog, error: existingError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('session_id', data.sessionId)
        .eq('student_id', data.studentId)
        .single()

      if (existingLog && !existingError) {
        return { log: null, error: 'Anda sudah melakukan absensi untuk sesi ini' }
      }

      // Create attendance log
      const { data: log, error } = await supabase
        .from('attendance_logs')
        .insert({
          session_id: data.sessionId,
          student_id: data.studentId,
          location_lat: data.locationLat,
          location_lng: data.locationLng,
          qr_code_data: data.qrCodeData,
          status: 'present',
          scanned_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      return { log, error: null }
    } catch (error: any) {
      return { log: null, error: error.message || 'Gagal menyimpan absensi' }
    }
  }

  async getSessionByToken(token: string): Promise<{ session: AttendanceSession | null; error: string | null }> {
    try {
      const { data: session, error } = await supabase
        .from('attendance_sessions')
        .select('*')
        .eq('session_token', token)
        .eq('is_active', true)
        .single()

      if (error) throw error

      return { session, error: null }
    } catch (error: any) {
      return { session: null, error: error.message || 'Sesi tidak ditemukan' }
    }
  }

  async getAttendanceByCourse(courseId: string, studentId?: string): Promise<{ logs: AttendanceLog[]; error: string | null }> {
    try {
      let query = supabase
        .from('attendance_logs')
        .select(`
          *,
          attendance_sessions!inner(
            course_id
          )
        `)
        .eq('attendance_sessions.course_id', courseId)

      if (studentId) {
        query = query.eq('student_id', studentId)
      }

      const { data: logs, error } = await query
        .order('scanned_at', { ascending: false })

      if (error) throw error

      return { logs: logs || [], error: null }
    } catch (error: any) {
      return { logs: [], error: error.message || 'Gagal mengambil data absensi' }
    }
  }

  async getAttendanceStats(courseId: string): Promise<{ stats: any; error: string | null }> {
    try {
      // Get total sessions for the course
      const { data: sessions, error: sessionsError } = await supabase
        .from('attendance_sessions')
        .select('id')
        .eq('course_id', courseId)

      if (sessionsError) throw sessionsError

      // Get total students enrolled in the course
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('enrollments')
        .select('student_id')
        .eq('course_id', courseId)

      if (enrollmentsError) throw enrollmentsError

      // Get attendance logs for the course
      const { data: logs, error: logsError } = await supabase
        .from('attendance_logs')
        .select(`
          *,
          attendance_sessions!inner(
            course_id
          )
        `)
        .eq('attendance_sessions.course_id', courseId)

      if (logsError) throw logsError

      const totalSessions = sessions?.length || 0
      const totalStudents = enrollments?.length || 0
      const totalAttendance = logs?.length || 0

      // Calculate attendance rate per student
      const studentAttendance = enrollments?.map(enrollment => {
        const studentLogs = logs?.filter(log => log.student_id === enrollment.student_id) || []
        const attendanceRate = totalSessions > 0 ? (studentLogs.length / totalSessions) * 100 : 0
        
        return {
          studentId: enrollment.student_id,
          attendanceCount: studentLogs.length,
          attendanceRate: Math.round(attendanceRate * 100) / 100
        }
      }) || []

      const stats = {
        totalSessions,
        totalStudents,
        totalAttendance,
        averageAttendanceRate: totalStudents > 0 ? Math.round((totalAttendance / (totalStudents * totalSessions)) * 10000) / 100 : 0,
        studentAttendance
      }

      return { stats, error: null }
    } catch (error: any) {
      return { stats: null, error: error.message || 'Gagal menghitung statistik absensi' }
    }
  }

  private generateSessionToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lng2 - lng1) * Math.PI / 180

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

    return R * c // Distance in meters
  }
}

export const attendanceService = new AttendanceService()
