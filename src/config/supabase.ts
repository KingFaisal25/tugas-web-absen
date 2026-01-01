import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(
  String(supabaseUrl || ''),
  String(supabaseAnonKey || '')
)

export type UserRole = 'mahasiswa' | 'dosen' | 'admin'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  npm?: string
  nidn?: string
  phone?: string
  program_studi?: string
  photo_url?: string
  face_descriptor?: string
  is_verified: boolean
  created_at: string
}

export interface Course {
  id: string
  code: string
  name: string
  dosen_id: string
  semester?: string
  created_at: string
}

export interface AttendanceSession {
  id: string
  course_id: string
  session_token: string
  expires_at: string
  is_active: boolean
  location_lat?: number
  location_lng?: number
  radius_meters?: number
  created_at: string
}

export interface AttendanceLog {
  id: string
  session_id: string
  student_id: string
  scanned_at: string
  status: 'present' | 'absent' | 'late'
  location_lat?: number
  location_lng?: number
  qr_code_data?: string
}

export interface Assignment {
  id: string
  course_id: string
  title: string
  description: string
  instructions?: string
  due_date: string
  max_score: number
  submission_type: 'file' | 'text' | 'url' | 'multiple'
  max_file_size_mb: number
  allowed_file_types: string[]
  rubric?: any
  template_url?: string
  status: 'draft' | 'published' | 'archived'
  created_by: string
  created_at: string
  updated_at: string
}

export interface AssignmentSubmission {
  id: string
  assignment_id: string
  student_id: string
  submission_text?: string
  file_urls?: string[]
  submission_date: string
  score?: number
  feedback?: string
  graded_by?: string
  graded_at?: string
  status: 'submitted' | 'graded' | 'returned' | 'late'
  is_late: boolean
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: 'assignment' | 'attendance' | 'deadline' | 'announcement' | 'system'
  related_id?: string
  related_type?: string
  is_read: boolean
  read_at?: string
  created_at: string
}
