import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase.ts'
import LecturerLayout from '../components/layout/LecturerLayout'
import { 
  PlusIcon, 
  BookOpenIcon, 
  QrCodeIcon, 
  UserGroupIcon, 
  ClipboardDocumentCheckIcon,
  XMarkIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'
import { QRCodeCanvas } from 'qrcode.react'

// --- TYPES ---
type Course = {
  id: string
  code: string
  name: string
  created_at?: string
}

type Session = {
  id: string
  course_id: string
  session_token: string
  created_at: string
  expires_at: string
}

type AttendanceLog = {
  id: string
  session_id: string
  student_id: string
  scanned_at: string
  student_name?: string // Joined manually or via view
}

type Assignment = {
  id: string
  title: string
  description: string
  due_date: string
  status: string
}

type Submission = {
  id: string
  assignment_id: string
  student_id: string
  file_url?: string
  content?: string
  score?: number
  feedback?: string
  status: string
  users?: {
    full_name: string
    npm: string
  }
}

const LecturerDashboard: React.FC = () => {
  const { user } = useAuth()
  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:3000', [])

  // --- STATE ---
  const [view, setView] = useState<'dashboard' | 'course_detail'>('dashboard')
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [activeTab, setActiveTab] = useState<'attendance' | 'assignments' | 'students' | 'grades'>('attendance')
  
  // Modals
  const [showAddCourseModal, setShowAddCourseModal] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showCreateAssignmentModal, setShowCreateAssignmentModal] = useState(false)
  
  // Forms
  const [newCourse, setNewCourse] = useState({ code: '', name: '' })
  const [newStudent, setNewStudent] = useState({ email: '', fullName: '', npm: '' })
  const [newAssignment, setNewAssignment] = useState({ title: '', description: '', deadline: '' })

  // Course Detail Data
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [logs, setLogs] = useState<AttendanceLog[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [students, setStudents] = useState<any[]>([]) // Placeholder for enrolled students

  // Loading
  const [loading, setLoading] = useState(false)

  // --- EFFECTS ---
  useEffect(() => {
    if (user) fetchCourses()
  }, [user])

  useEffect(() => {
    if (selectedCourse) {
      if (activeTab === 'attendance') fetchSessions()
      if (activeTab === 'assignments') fetchAssignments()
      if (activeTab === 'students') fetchStudents() // Logic to fetch students
    }
  }, [selectedCourse, activeTab])

  // Real-time Logs for Active Session
  useEffect(() => {
    if (!activeSession) return
    const channel = supabase
      .channel(`session_${activeSession.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'attendance_logs', 
        filter: `session_id=eq.${activeSession.id}` 
      }, (payload) => {
        // Fetch full log to get student name if possible, or just add raw
        setLogs(prev => [payload.new as AttendanceLog, ...prev])
      })
      .subscribe()
    
    return () => { supabase.removeChannel(channel) }
  }, [activeSession])

  // --- ACTIONS ---

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${apiBase}/api/courses?dosenId=${user?.id}`)
      const data = await res.json()
      if (Array.isArray(data)) setCourses(data)
    } catch (error) {
      console.error('Error fetching courses:', error)
    }
  }

  const handleCreateCourse = async () => {
    if (!newCourse.code || !newCourse.name) return alert('Mohon lengkapi data')
    try {
      const res = await fetch(`${apiBase}/api/courses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newCourse, dosenId: user?.id })
      })
      const data = await res.json()
      if (data.id) {
        setCourses([data, ...courses])
        setShowAddCourseModal(false)
        setNewCourse({ code: '', name: '' })
      }
    } catch (error) {
      alert('Gagal membuat mata kuliah')
    }
  }

  const handleCreateStudent = async () => {
    // This creates a user. In a real app, you'd also enroll them.
    // For now, we just create the user as requested "add feature for students".
    if (!newStudent.email || !newStudent.fullName || !newStudent.npm) return alert('Lengkapi data')
    try {
      const res = await fetch(`${apiBase}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newStudent, role: 'mahasiswa' })
      })
      const data = await res.json()
      if (data.id) {
        alert('Mahasiswa berhasil ditambahkan!')
        setShowAddStudentModal(false)
        setNewStudent({ email: '', fullName: '', npm: '' })
        // If we had enrollment, we'd add it here.
      }
    } catch (error) {
      alert('Gagal menambah mahasiswa')
    }
  }

  const fetchSessions = async () => {
    if (!selectedCourse) return
    const res = await fetch(`${apiBase}/api/attendance/sessions?courseId=${selectedCourse.id}`)
    const data = await res.json()
    if (Array.isArray(data)) {
      setSessions(data)
      // Check for active session
      const active = data.find(s => new Date(s.expires_at) > new Date())
      if (active) {
        setActiveSession(active)
        fetchLogs(active.id)
      }
    }
  }

  const startSession = async () => {
    if (!selectedCourse) return
    try {
      const res = await fetch(`${apiBase}/api/attendance/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourse.id, duration: 60 })
      })
      const data = await res.json()
      if (data.session_token) {
        setActiveSession(data)
        setSessions([data, ...sessions])
      }
    } catch (error) {
      alert('Gagal memulai sesi')
    }
  }

  const fetchLogs = async (sessionId: string) => {
    const res = await fetch(`${apiBase}/api/attendance/logs?sessionId=${sessionId}`)
    const data = await res.json()
    if (Array.isArray(data)) setLogs(data)
  }

  const fetchAssignments = async () => {
    if (!selectedCourse) return
    const res = await fetch(`${apiBase}/api/assignments?courseId=${selectedCourse.id}`)
    const data = await res.json()
    if (Array.isArray(data)) setAssignments(data)
  }

  const handleCreateAssignment = async () => {
    if (!selectedCourse) return
    try {
      const res = await fetch(`${apiBase}/api/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse.id,
          ...newAssignment,
          createdBy: user?.id
        })
      })
      const data = await res.json()
      if (data.id) {
        setAssignments([data, ...assignments])
        setShowCreateAssignmentModal(false)
        setNewAssignment({ title: '', description: '', deadline: '' })
      }
    } catch (error) {
      alert('Gagal membuat tugas')
    }
  }

  const fetchSubmissions = async (assignmentId: string) => {
    const res = await fetch(`${apiBase}/api/assignments/submissions?assignmentId=${assignmentId}`)
    const data = await res.json()
    if (Array.isArray(data)) setSubmissions(data)
  }

  const handleGrade = async (submissionId: string, score: number) => {
    try {
      const res = await fetch(`${apiBase}/api/assignments/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, score, feedback: 'Graded via Dashboard' })
      })
      const data = await res.json()
      if (data.id) {
        setSubmissions(prev => prev.map(s => s.id === submissionId ? { ...s, score, status: 'graded' } : s))
      }
    } catch (error) {
      alert('Gagal menyimpan nilai')
    }
  }

  const fetchStudents = async () => {
    // For now, fetch all users who are 'mahasiswa'? 
    // Or maybe just leave it empty if we don't have enrollment endpoint yet.
    // Let's stub it or fetch active students from logs as a proxy
    // This is a limitation without enrollment table.
    // We will just show "Fitur ini memerlukan tabel enrollment" or similar if empty.
  }

  // --- RENDER HELPERS ---

  const renderDashboard = () => (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Dosen</h1>
        <p className="mt-2 text-gray-600">Kelola mata kuliah dan aktivitas akademik Anda.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add Course Card */}
        <button 
          onClick={() => setShowAddCourseModal(true)}
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group h-64"
        >
          <div className="p-4 bg-gray-100 rounded-full group-hover:bg-blue-100 transition-colors">
            <PlusIcon className="w-8 h-8 text-gray-400 group-hover:text-blue-600" />
          </div>
          <span className="mt-4 font-medium text-gray-600 group-hover:text-blue-700">Tambah Mata Kuliah</span>
        </button>

        {/* Course Cards */}
        {courses.map(course => (
          <div 
            key={course.id}
            onClick={() => { setSelectedCourse(course); setView('course_detail'); }}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between h-64"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                  <BookOpenIcon className="w-6 h-6" />
                </div>
                {/* <button className="text-gray-400 hover:text-red-500"><TrashIcon className="w-5 h-5" /></button> */}
              </div>
              <h3 className="mt-4 text-xl font-bold text-gray-900 line-clamp-2">{course.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{course.code}</p>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Klik untuk kelola</span>
              <ArrowLeftIcon className="w-4 h-4 rotate-180" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const renderCourseDetail = () => {
    if (!selectedCourse) return null
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb & Header */}
        <button 
          onClick={() => { setView('dashboard'); setSelectedCourse(null); }}
          className="flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6"
        >
          <ArrowLeftIcon className="w-4 h-4 mr-2" />
          Kembali ke Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-8 py-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
            <h1 className="text-3xl font-bold">{selectedCourse.name}</h1>
            <p className="opacity-80 mt-2 text-lg">{selectedCourse.code}</p>
          </div>
          
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-gray-50 px-8">
            <button 
              onClick={() => setActiveTab('attendance')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                <QrCodeIcon className="w-5 h-5" />
                Absensi & QR
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('assignments')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'assignments' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                <ClipboardDocumentCheckIcon className="w-5 h-5" />
                Tugas & Nilai
              </div>
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'students' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5" />
                Mahasiswa
              </div>
            </button>
          </div>

          <div className="p-8">
            {/* Tab: Attendance */}
            {activeTab === 'attendance' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-center">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Sesi Aktif</h3>
                    {activeSession ? (
                      <div className="flex flex-col items-center">
                        <div className="p-4 bg-white border-2 border-gray-900 rounded-xl mb-4">
                          <QRCodeCanvas value={activeSession.session_token} size={200} />
                        </div>
                        <p className="text-2xl font-mono font-bold tracking-wider text-gray-800 mb-2">{activeSession.session_token}</p>
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                          Sesi Berjalan (Expires: {new Date(activeSession.expires_at).toLocaleTimeString()})
                        </p>
                      </div>
                    ) : (
                      <div className="py-8">
                        <QrCodeIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 mb-6">Tidak ada sesi aktif saat ini.</p>
                        <button 
                          onClick={startSession}
                          className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors w-full flex items-center justify-center gap-2"
                        >
                          <PlusIcon className="w-5 h-5" />
                          Mulai Sesi Baru
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:col-span-2">
                   <h3 className="text-lg font-bold text-gray-900 mb-4">Riwayat & Log Kehadiran</h3>
                   <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                     {logs.length > 0 ? (
                       <table className="min-w-full divide-y divide-gray-200">
                         <thead className="bg-gray-50">
                           <tr>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mahasiswa</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waktu Scan</th>
                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                           </tr>
                         </thead>
                         <tbody className="bg-white divide-y divide-gray-200">
                           {logs.map(log => (
                             <tr key={log.id}>
                               <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{log.student_id.substring(0,8)}...</td>
                               <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.scanned_at).toLocaleTimeString()}</td>
                               <td className="px-6 py-4 whitespace-nowrap">
                                 <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Hadir</span>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     ) : (
                       <div className="p-8 text-center text-gray-500">Belum ada data kehadiran untuk sesi ini.</div>
                     )}
                   </div>
                </div>
              </div>
            )}

            {/* Tab: Assignments */}
            {activeTab === 'assignments' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Daftar Tugas</h3>
                  <button 
                    onClick={() => setShowCreateAssignmentModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Buat Tugas
                  </button>
                </div>
                
                <div className="grid gap-4">
                  {assignments.map(assign => (
                    <div key={assign.id} className="border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="text-lg font-bold text-gray-900">{assign.title}</h4>
                          <p className="text-gray-600 mt-1">{assign.description}</p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                             <span className="flex items-center gap-1"><ClockIcon className="w-4 h-4" /> Due: {new Date(assign.due_date).toLocaleDateString()}</span>
                             <span className={`px-2 py-0.5 rounded text-xs font-medium ${assign.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100'}`}>
                               {assign.status}
                             </span>
                          </div>
                        </div>
                        <button 
                          onClick={() => { setSelectedAssignment(assign); fetchSubmissions(assign.id); }}
                          className="px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 text-sm font-medium"
                        >
                          Lihat Pengumpulan
                        </button>
                      </div>
                      
                      {/* Submissions Section (Inline if selected) */}
                      {selectedAssignment?.id === assign.id && (
                        <div className="mt-6 pt-6 border-t border-gray-100 bg-gray-50 -mx-6 px-6 pb-4">
                          <h5 className="font-bold text-gray-800 mb-4">Pengumpulan Tugas</h5>
                          {submissions.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">Belum ada pengumpulan.</p>
                          ) : (
                            <div className="space-y-3">
                              {submissions.map(sub => (
                                <div key={sub.id} className="bg-white p-4 rounded-lg border border-gray-200 flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-gray-900">{sub.users?.full_name || sub.student_id}</p>
                                    <p className="text-xs text-gray-500">{sub.users?.npm}</p>
                                    {sub.file_url && (
                                      <a href={sub.file_url} target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline mt-1 block">
                                        Lihat File
                                      </a>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="flex flex-col items-end">
                                      <span className="text-xs text-gray-500">Nilai</span>
                                      <input 
                                        type="number" 
                                        className="w-16 px-2 py-1 border rounded text-sm text-right"
                                        placeholder="0-100"
                                        defaultValue={sub.score}
                                        onBlur={(e) => handleGrade(sub.id, Number(e.target.value))}
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab: Students */}
            {activeTab === 'students' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Mahasiswa Terdaftar</h3>
                  <button 
                    onClick={() => setShowAddStudentModal(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-2"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Tambah Mahasiswa
                  </button>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                  <p>Fitur manajemen kelas penuh sedang dalam pengembangan. Saat ini Anda dapat menambahkan akun mahasiswa baru ke dalam sistem.</p>
                </div>

                {/* Placeholder List */}
                <div className="text-center py-12 text-gray-400">
                  <UserGroupIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Daftar mahasiswa akan muncul di sini setelah mereka melakukan absensi atau didaftarkan ke kelas.</p>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    )
  }

  // --- MODALS ---
  
  return (
    <LecturerLayout title="Dashboard Dosen">
      {view === 'dashboard' ? renderDashboard() : renderCourseDetail()}

      {/* Add Course Modal */}
      {showAddCourseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Tambah Mata Kuliah</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kode MK</label>
                <input 
                  value={newCourse.code} 
                  onChange={e => setNewCourse({...newCourse, code: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="IF1234"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Mata Kuliah</label>
                <input 
                  value={newCourse.name} 
                  onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Pemrograman Web"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAddCourseModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                <button onClick={handleCreateCourse} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Tambah Mahasiswa Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  value={newStudent.email} 
                  onChange={e => setNewStudent({...newStudent, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  type="email"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap</label>
                <input 
                  value={newStudent.fullName} 
                  onChange={e => setNewStudent({...newStudent, fullName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">NPM</label>
                <input 
                  value={newStudent.npm} 
                  onChange={e => setNewStudent({...newStudent, npm: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAddStudentModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                <button onClick={handleCreateStudent} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Tambah</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showCreateAssignmentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Buat Tugas Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Judul Tugas</label>
                <input 
                  value={newAssignment.title} 
                  onChange={e => setNewAssignment({...newAssignment, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                <textarea 
                  value={newAssignment.description} 
                  onChange={e => setNewAssignment({...newAssignment, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenggat Waktu</label>
                <input 
                  type="datetime-local"
                  value={newAssignment.deadline} 
                  onChange={e => setNewAssignment({...newAssignment, deadline: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowCreateAssignmentModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Batal</button>
                <button onClick={handleCreateAssignment} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Simpan</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </LecturerLayout>
  )
}

export default LecturerDashboard
