import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../config/supabase.ts'
import { useAuth } from '../contexts/AuthContext'
import { PlusIcon, QrCodeIcon, TrashIcon, BookOpenIcon, ClipboardDocumentCheckIcon, ArrowRightIcon, CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'
import { QRCodeCanvas } from 'qrcode.react'
import LecturerLayout from '../components/layout/LecturerLayout'

type QRItem = {
  id: string
  type: string
  image_url?: string
  encrypted_data?: string
  created_at?: string
}

type AssignmentItem = {
  id: string
  title: string
  description?: string
  due_date?: string
  status?: string
}

type AttendanceSessionItem = {
  id: string
  course_id: string
  session_token: string
  expires_at: string
  created_at?: string
}

type AttendanceLogItem = {
  id: string
  session_id: string
  student_id: string
  scanned_at?: string
  status?: string
}

const LecturerDashboard: React.FC = () => {
  const { user } = useAuth()
  
  // Wizard State
  const [wizardStep, setWizardStep] = useState(1) // 1: Course, 2: Assignment, 3: QR
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDesc, setAssignmentDesc] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false)
  
  // General State
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [activeSessionToken, setActiveSessionToken] = useState<string>('')
  const [sessions, setSessions] = useState<AttendanceSessionItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [logs, setLogs] = useState<AttendanceLogItem[]>([])
  const [assignments, setAssignments] = useState<AssignmentItem[]>([])
  
  // Legacy/Other State (kept for compatibility or future use)
  const [qrType, setQrType] = useState('attendance')
  const [qrData, setQrData] = useState('')
  const [qrSize, setQrSize] = useState<number>(300)
  const [qrLoading, setQrLoading] = useState(false)

  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:3000', [])
  
  const formatDate = (iso?: string) => {
    if (!iso) return '-'
    const d = new Date(iso)
    const date = d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const day = d.toLocaleDateString('id-ID', { weekday: 'long' })
    const time = d.toLocaleTimeString('id-ID', { hour12: false })
    return `${date} • ${day} • ${time}`
  }

  useEffect(() => {
    if (!user) return
    loadCourses()
  }, [user])

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  }

  const loadCourses = async () => {
    if (!user) return
    try {
      const res = await fetch(`${apiBase}/api/courses?dosenId=${encodeURIComponent(user.id)}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setCourses(data)
        // Don't auto-select in wizard mode, let user choose
      }
    } catch {}
  }

  const startSession = async () => {
    if (!user || !selectedCourseId) return
    setQrLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/attendance/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId, duration: 60 })
      })
      const data = await res.json()
      if (data?.session_token || data?.session?.session_token) {
        const token = data.session_token || data.session.session_token
        setActiveSessionToken(token)
        loadSessions() // Refresh stats
      }
    } catch {
      alert('Gagal membuat sesi')
    } finally {
      setQrLoading(false)
    }
  }

  const createAssignment = async () => {
    if (!user || !selectedCourseId || !assignmentTitle) return
    setIsCreatingAssignment(true)
    try {
      const res = await fetch(`${apiBase}/api/assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourseId,
          title: assignmentTitle,
          description: assignmentDesc,
          deadline: assignmentDeadline,
          createdBy: user.id
        })
      })
      const data = await res.json()
      if (!data.error) {
        // Assignment created
        loadAssignments()
      }
    } catch {
      alert('Gagal membuat tugas')
    } finally {
      setIsCreatingAssignment(false)
    }
  }

  const loadSessions = async () => {
    if (!selectedCourseId) return
    try {
      const params = new URLSearchParams({ courseId: selectedCourseId })
      const res = await fetch(`${apiBase}/api/attendance/sessions?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setSessions(data)
        if (data.length > 0 && !selectedSessionId) setSelectedSessionId(data[0].id)
      }
    } catch {}
  }

  const loadAssignments = async () => {
    if (!selectedCourseId) return
    try {
      const res = await fetch(`${apiBase}/api/assignments?courseId=${selectedCourseId}`)
      const data = await res.json()
      if (Array.isArray(data)) setAssignments(data)
    } catch {}
  }
  
  const loadLogs = async () => {
    if (!selectedSessionId) return
    try {
      const params = new URLSearchParams({ sessionId: selectedSessionId })
      const res = await fetch(`${apiBase}/api/attendance/logs?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) setLogs(data)
    } catch {}
  }

  useEffect(() => { 
    if (selectedCourseId) {
      loadSessions()
      loadAssignments()
    }
  }, [selectedCourseId])

  useEffect(() => { loadLogs() }, [selectedSessionId])
  
  // Real-time logs
  useEffect(() => {
    if (!selectedSessionId) return
    const channel = supabase
      .channel('attendance_logs_channel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'attendance_logs', filter: `session_id=eq.${selectedSessionId}` }, payload => {
        setLogs(prev => [payload.new as any as AttendanceLogItem, ...prev])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [selectedSessionId])

  // Wizard Handlers
  const handleWizardNext = async () => {
    if (wizardStep === 1) {
      if (!selectedCourseId) {
        alert('Pilih mata kuliah terlebih dahulu')
        return
      }
      setWizardStep(2)
    } else if (wizardStep === 2) {
      if (assignmentTitle) {
        await createAssignment()
      }
      // Generate Session automatically when moving to Step 3
      await startSession()
      setWizardStep(3)
    }
  }

  const handleWizardBack = () => {
    if (wizardStep > 1) setWizardStep(wizardStep - 1)
  }
  
  const resetWizard = () => {
    setWizardStep(1)
    setAssignmentTitle('')
    setAssignmentDesc('')
    setAssignmentDeadline('')
    setActiveSessionToken('')
  }

  return (
    <LecturerLayout title="Dashboard Dosen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard Dosen</h1>
          <p className="mt-2 text-gray-600">Mulai sesi kelas, kelola tugas, dan pantau kehadiran mahasiswa.</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
              <BookOpenIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Kelas</p>
              <p className="text-2xl font-bold text-gray-900">{courses.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4">
             <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <ClipboardDocumentCheckIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Sesi Aktif</p>
              <p className="text-2xl font-bold text-gray-900">{sessions.length}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4">
             <div className="p-3 bg-purple-100 text-purple-600 rounded-full">
              <QrCodeIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Kehadiran</p>
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Wizard (Takes 2/3 width) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Mulai Sesi Kelas Baru</h2>
                <div className="flex items-center space-x-2 text-sm text-gray-500">
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full ${wizardStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</span>
                  <div className="w-4 h-0.5 bg-gray-300"></div>
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full ${wizardStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</span>
                  <div className="w-4 h-0.5 bg-gray-300"></div>
                  <span className={`flex items-center justify-center w-6 h-6 rounded-full ${wizardStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>3</span>
                </div>
              </div>
              
              <div className="p-8">
                {/* Step 1: Select Course */}
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Mata Kuliah</label>
                      <select 
                        value={selectedCourseId} 
                        onChange={e => setSelectedCourseId(e.target.value)} 
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      >
                        <option value="">-- Pilih Mata Kuliah --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button 
                        onClick={handleWizardNext}
                        disabled={!selectedCourseId}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Lanjut
                        <ArrowRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Assignment */}
                {wizardStep === 2 && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                      <p className="text-sm text-blue-800">Opsional: Buat tugas baru untuk sesi ini.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Judul Tugas</label>
                      <input 
                        value={assignmentTitle} 
                        onChange={e => setAssignmentTitle(e.target.value)}
                        placeholder="Contoh: Tugas Pendahuluan Modul 1"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsi</label>
                      <textarea 
                        value={assignmentDesc} 
                        onChange={e => setAssignmentDesc(e.target.value)}
                        placeholder="Deskripsi tugas..."
                        rows={3}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Tenggat Waktu</label>
                      <input 
                        type="datetime-local"
                        value={assignmentDeadline} 
                        onChange={e => setAssignmentDeadline(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-between items-center pt-4">
                      <button onClick={handleWizardBack} className="text-gray-600 hover:text-gray-900 font-medium">
                        Kembali
                      </button>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => { setAssignmentTitle(''); handleWizardNext(); }}
                          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                        >
                          Lewati
                        </button>
                        <button 
                          onClick={handleWizardNext}
                          disabled={isCreatingAssignment || (assignmentTitle && !assignmentDeadline)}
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
                        >
                          {isCreatingAssignment ? 'Menyimpan...' : (assignmentTitle ? 'Simpan & Buat QR' : 'Lanjut')}
                          <ArrowRightIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: QR Display */}
                {wizardStep === 3 && (
                  <div className="text-center space-y-6">
                    <div className="flex justify-center">
                      <div className="p-6 bg-white border-2 border-gray-900 rounded-2xl shadow-xl">
                        {qrLoading ? (
                          <div className="w-64 h-64 flex items-center justify-center text-gray-400">Loading QR...</div>
                        ) : activeSessionToken ? (
                          <QRCodeCanvas value={activeSessionToken} size={256} />
                        ) : (
                          <div className="w-64 h-64 flex items-center justify-center text-red-400">Gagal memuat QR</div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Scan untuk Absensi</h3>
                      <p className="text-gray-600 mt-2">Kode ini berlaku selama 60 menit.</p>
                      <p className="text-xs text-gray-400 mt-1 font-mono">{activeSessionToken}</p>
                    </div>
                    <div className="flex justify-center pt-4">
                      <button 
                        onClick={resetWizard}
                        className="flex items-center gap-2 px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg"
                      >
                        <CheckCircleIcon className="w-5 h-5" />
                        Selesai
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Assignments List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900">Tugas Terbaru</h3>
              </div>
              <div className="space-y-4">
                {assignments.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">Belum ada tugas untuk mata kuliah ini.</p>
                ) : (
                  assignments.map(a => (
                    <div key={a.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="font-semibold text-gray-900">{a.title}</p>
                        <p className="text-sm text-gray-500">{a.due_date ? new Date(a.due_date).toLocaleString('id-ID') : 'Tanpa tenggat'}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                        {a.status || 'Active'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Attendance Logs (Takes 1/3 width) */}
          <div className="space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Log Kehadiran Live</h3>
              
              <div className="mb-4">
                 <select 
                   value={selectedSessionId} 
                   onChange={e => setSelectedSessionId(e.target.value)}
                   className="w-full text-sm border-gray-300 rounded-lg"
                 >
                   <option value="">-- Pilih Sesi --</option>
                   {sessions.map(s => <option key={s.id} value={s.id}>{formatDate(s.created_at)}</option>)}
                 </select>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {logs.length === 0 ? (
                   <p className="text-gray-500 text-center py-4">Belum ada data kehadiran.</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{log.student_id.substring(0, 8)}...</p>
                        <p className="text-xs text-gray-500">{log.scanned_at ? new Date(log.scanned_at).toLocaleTimeString() : '-'}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </LecturerLayout>
  )
}

export default LecturerDashboard
