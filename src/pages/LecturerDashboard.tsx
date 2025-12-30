import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../config/supabase.ts'
import { useAuth } from '../contexts/AuthContext'
import { PlusIcon, QrCodeIcon, TrashIcon } from '@heroicons/react/24/outline'
import { QRCodeCanvas } from 'qrcode.react'
import LecturerLayout from '../components/layout/LecturerLayout'

type QRItem = {
  id: string
  type: string
  image_url?: string
  encrypted_data?: string
  created_at?: string
}

type TaskItem = {
  id: string
  title: string
  description?: string
  deadline?: string
  priority?: string
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
  const [qrType, setQrType] = useState('class')
  const [qrData, setQrData] = useState('')
  const [qrSize, setQrSize] = useState<number>(500)
  const [qrLoading, setQrLoading] = useState(false)
  const [qrList, setQrList] = useState<QRItem[]>([])
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [courseError, setCourseError] = useState<string | null>(null)
  const [activeSessionToken, setActiveSessionToken] = useState<string>('')
  const [sessions, setSessions] = useState<AttendanceSessionItem[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>('')
  const [logs, setLogs] = useState<AttendanceLogItem[]>([])
  const [taskLoading, setTaskLoading] = useState(false)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [materials, setMaterials] = useState<{ name: string; url: string; created_at?: string }[]>([])
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskDeadline, setTaskDeadline] = useState('')
  const [taskPriority, setTaskPriority] = useState('normal')
  const [otpMethod, setOtpMethod] = useState<'email' | 'sms'>('email')
  const [otpCode, setOtpCode] = useState('')
  const [otpStatus, setOtpStatus] = useState<string | null>(null)
  const [otpExpiry, setOtpExpiry] = useState<string | null>(null)
  const [otpRemaining, setOtpRemaining] = useState<number>(0)

  const apiBase = useMemo(() => 'http://localhost:3000', [])
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
    loadQRList()
    loadTasks()
    loadCourses()
  }, [user])

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  }

  const loadQRList = async () => {
    if (!user) return
    setQrLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${apiBase}/api/qr/user/${user.id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await res.json()
      if (data?.items) setQrList(data.items)
    } finally {
      setQrLoading(false)
    }
  }

  const loadCourses = async () => {
    if (!user) return
    try {
      const res = await fetch(`${apiBase}/api/courses?dosenId=${encodeURIComponent(user.id)}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setCourses(data)
        if (data.length > 0) setSelectedCourseId(data[0].id)
      }
    } catch {}
  }

  const startSession = async () => {
    if (!user || !selectedCourseId) return
    try {
      const expiresAt = new Date(Date.now() + 60 * 60000).toISOString()
      const res = await fetch(`${apiBase}/api/attendance/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courseId: selectedCourseId, duration: 60 })
      })
      const data = await res.json()
      if (data?.session_token || data?.session?.session_token) {
        const token = data.session_token || data.session.session_token
        setActiveSessionToken(token)
        setQrType('attendance')
        setQrData(token)
        loadSessions()
      }
    } catch {}
  }

  const loadSessions = async () => {
    if (!selectedCourseId) return
    try {
      const params = new URLSearchParams({ courseId: selectedCourseId })
      const res = await fetch(`${apiBase}/api/attendance/sessions?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setSessions(data)
        if (data.length > 0) setSelectedSessionId(data[0].id)
      }
    } catch {}
  }

  const loadMaterials = async () => {
    if (!selectedCourseId) return
    try {
      const params = new URLSearchParams({ courseId: selectedCourseId })
      const res = await fetch(`${apiBase}/api/materials/list?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) setMaterials(data as any)
    } catch {}
  }

  const uploadMaterial = async () => {
    if (!materialFile || !selectedCourseId) return
    try {
      const token = await getAccessToken()
      const form = new FormData()
      form.append('file', materialFile)
      form.append('courseId', selectedCourseId)
      const res = await fetch(`${apiBase}/api/materials/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: form
      })
      const data = await res.json()
      if (!data?.error) {
        setMaterialFile(null)
        loadMaterials()
      }
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

  useEffect(() => { loadSessions() }, [selectedCourseId])
  useEffect(() => { loadMaterials() }, [selectedCourseId])
  useEffect(() => { loadLogs() }, [selectedSessionId])
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

  const exportCsv = () => {
    const headers = ['id', 'student_id', 'session_id', 'status', 'scanned_at']
    const rows = logs.map(l => [l.id, l.student_id, l.session_id, l.status || 'present', l.scanned_at || ''])
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `attendance_logs_${selectedSessionId || 'session'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const generateQR = async () => {
    if (!user || !qrData.trim()) return
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!selectedCourseId || !uuidRegex.test(selectedCourseId)) {
      setCourseError(!selectedCourseId ? 'Mata kuliah wajib dipilih' : 'Format ID mata kuliah tidak valid')
      return
    }
    setCourseError(null)
    setQrLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${apiBase}/api/qr/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          userId: user.id,
          type: 'class',
          courseId: selectedCourseId,
          data: qrData,
          settings: { is_private: false, scan_limit: 1000, width: qrSize }
        })
      })
      const created = await res.json()
      if (!created?.error) {
        setQrList([created, ...qrList])
        setQrData('')
      }
    } finally {
      setQrLoading(false)
    }
  }

  const sendOtp = async () => {
    if (!user) return
    setOtpStatus(null)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${apiBase}/api/verify/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId: user.id, method: otpMethod })
      })
      const d = await res.json()
      if (d?.error) {
        setOtpStatus(`Gagal kirim OTP: ${d.error}`)
        setOtpExpiry(null)
        setOtpRemaining(0)
      } else {
        setOtpStatus('OTP terkirim. Cek email/SMS Anda.')
        if (d?.expiry) {
          setOtpExpiry(d.expiry)
        } else {
          const fallback = new Date(Date.now() + 10 * 60000).toISOString()
          setOtpExpiry(fallback)
        }
        setOtpCode('')
      }
    } catch (e: any) {
      setOtpStatus(e.message || 'Gagal kirim OTP')
    }
  }

  const verifyOtp = async () => {
    if (!user || !otpCode.trim()) return
    setOtpStatus(null)
    try {
      const token = await getAccessToken()
      const res = await fetch(`${apiBase}/api/verify/otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ userId: user.id, otp: otpCode.trim() })
      })
      const d = await res.json()
      if (d?.error) setOtpStatus(`Verifikasi gagal: ${d.error}`)
      else {
        setOtpStatus('Verifikasi OTP berhasil.')
        setOtpExpiry(null)
        setOtpRemaining(0)
      }
    } catch (e: any) {
      setOtpStatus(e.message || 'Verifikasi OTP gagal')
    }
  }

  useEffect(() => {
    if (!otpExpiry) {
      setOtpRemaining(0)
      return
    }
    const update = () => {
      const diff = new Date(otpExpiry).getTime() - Date.now()
      setOtpRemaining(Math.max(0, Math.floor(diff / 1000)))
      if (diff <= 0) {
        setOtpStatus('Kode OTP kedaluwarsa. Silakan kirim ulang.')
      }
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [otpExpiry])

  const deleteQR = async (id: string) => {
    if (!user) return
    setQrLoading(true)
    try {
      const token = await getAccessToken()
      await fetch(`${apiBase}/api/qr/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      setQrList(qrList.filter(i => i.id !== id))
    } finally {
      setQrLoading(false)
    }
  }

  const loadTasks = async () => {
    if (!user) return
    setTaskLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/tasks?userId=${encodeURIComponent(user.id)}`)
      const data = await res.json()
      if (Array.isArray(data)) setTasks(data)
    } finally {
      setTaskLoading(false)
    }
  }

  const addTask = async () => {
    if (!user || !taskTitle.trim()) return
    setTaskLoading(true)
    try {
      const res = await fetch(`${apiBase}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          title: taskTitle,
          description: taskDescription || null,
          deadline: taskDeadline || null,
          priority: taskPriority
        })
      })
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        setTasks([data[0], ...tasks])
        setTaskTitle('')
        setTaskDescription('')
        setTaskDeadline('')
        setTaskPriority('normal')
      }
    } finally {
      setTaskLoading(false)
    }
  }

  return (
    <LecturerLayout title="Dashboard Dosen">
      <div className="max-w-6xl mx-auto px-2 md:px-6 py-6 md:py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard Dosen</h1>
            <p className="text-gray-600">Kelola kelas, statistik kehadiran, materi, dan tugas</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Jumlah Kelas</p>
            <p className="text-2xl font-semibold text-primary">{courses.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Sesi Aktif/Minggu</p>
            <p className="text-2xl font-semibold text-primary">{sessions.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-600">Log Kehadiran</p>
            <p className="text-2xl font-semibold text-primary">{logs.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Verifikasi MFA</h2>
            </div>
            <div className="p-6 space-y-4">
              {otpStatus && <div className="p-3 rounded border text-sm">{otpStatus}</div>}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metode</label>
                  <select value={otpMethod} onChange={e => setOtpMethod(e.target.value as 'email' | 'sms')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex items-end">
                  <button onClick={sendOtp} className="w-full inline-flex items-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 focus:ring-2 focus:ring-gray-500">
                    Kirim OTP
                  </button>
                </div>
              </div>
              {otpExpiry && (
                <div className="text-sm text-gray-700">
                  <p>
                    Waktu tersisa: {String(Math.floor(otpRemaining / 60)).padStart(2, '0')}:
                    {String(otpRemaining % 60).padStart(2, '0')}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kode OTP</label>
                  <input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="Masukkan kode OTP" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={verifyOtp} disabled={otpRemaining === 0 && !!otpExpiry} className="w-full inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-60 disabled:cursor-not-allowed">
                    Verifikasi
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Generator QR</h2>
              <QrCodeIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mata Kuliah</label>
                  <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                    <option value="">Pilih mata kuliah</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                  </select>
                  {courseError && <p className="mt-1 text-sm text-red-600">{courseError}</p>}
                </div>
              <div className="flex items-end">
                <button onClick={startSession} className="w-full inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500">
                  Mulai
                </button>
              </div>
            </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
                <select value={qrType} onChange={e => setQrType(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500">
                  <option value="attendance">Absensi</option>
                  <option value="link">Tautan</option>
                  <option value="text">Teks</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input value={qrData} onChange={e => setQrData(e.target.value)} placeholder="Masukkan data QR" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ukuran (px)</label>
                <input
                  type="number"
                  min={128}
                  max={1024}
                  value={qrSize}
                  onChange={e => setQrSize(Math.max(128, Math.min(1024, Number(e.target.value) || 500)))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>
              <div className="flex justify-end">
                <button onClick={generateQR} disabled={qrLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500">
                  <PlusIcon className="h-5 w-5" />
                  Buat QR
                </button>
              </div>
              {activeSessionToken && (
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-gray-700 mb-2">QR Sesi Aktif (scan oleh mahasiswa):</p>
                    <QRCodeCanvas value={activeSessionToken} size={160} />
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Token: {activeSessionToken}</p>
                    <p>Format waktu: {new Date().toLocaleString('id-ID')}</p>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Daftar QR</h3>
                <div className="space-y-3">
                  {qrList.map(item => (
                    <div key={item.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        {item.image_url ? (
                          <img src={item.image_url} alt="QR" className="h-16 w-16 rounded border" />
                        ) : (
                          <div className="h-16 w-16 rounded border bg-gray-100" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">Tipe: {item.type}</p>
                          <p className="text-sm text-gray-600">ID: {item.id}</p>
                        </div>
                      </div>
                      <button onClick={() => deleteQR(item.id)} className="p-2 rounded bg-red-50 hover:bg-red-100">
                        <TrashIcon className="h-5 w-5 text-red-600" />
                      </button>
                    </div>
                  ))}
                  {qrList.length === 0 && (
                    <p className="text-sm text-gray-500">Belum ada QR. Buat QR pertama Anda.</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Notifikasi</h2>
            </div>
            <div className="p-6 space-y-3">
              {tasks
                .filter(t => t.deadline)
                .sort((a, b) => new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime())
                .slice(0, 5)
                .map(t => (
                  <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      <p className="text-sm text-gray-600">Batas: {new Date(t.deadline || '').toLocaleString('id-ID')}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{t.priority || 'normal'}</span>
                  </div>
                ))}
              {tasks.filter(t => t.deadline).length === 0 && <p className="text-sm text-gray-500">Tidak ada notifikasi tenggat waktu.</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Manajemen Tugas</h2>
              <PlusIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Judul</label>
                  <input value={taskTitle} onChange={e => setTaskTitle(e.target.value)} placeholder="Judul tugas" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Batas Waktu</label>
                  <input type="datetime-local" value={taskDeadline} onChange={e => setTaskDeadline(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
                  <input value={taskDescription} onChange={e => setTaskDescription(e.target.value)} placeholder="Deskripsi tugas" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
                  <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="low">Rendah</option>
                    <option value="normal">Normal</option>
                    <option value="high">Tinggi</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end">
                <button onClick={addTask} disabled={taskLoading} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">
                  <PlusIcon className="h-5 w-5" />
                  Tambah Tugas
                </button>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Daftar Tugas</h3>
                <div className="space-y-3">
                  {tasks.map(item => (
                    <div key={item.id} className="p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">{item.title}</p>
                        <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{item.priority || 'normal'}</span>
                      </div>
                      {item.description ? <p className="text-sm text-gray-600 mt-1">{item.description}</p> : null}
                      {item.deadline ? <p className="text-xs text-gray-500 mt-1">Batas: {new Date(item.deadline).toLocaleString()}</p> : null}
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-sm text-gray-500">Belum ada tugas. Tambahkan tugas untuk mahasiswa.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Materi Perkuliahan</h2>
              <button onClick={loadMaterials} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Refresh</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <input onChange={e => setMaterialFile(e.target.files?.[0] || null)} type="file" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div className="flex items-end">
                  <button onClick={uploadMaterial} className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">Upload</button>
                </div>
              </div>
              <div className="space-y-3">
                {materials.map(m => (
                  <a key={m.name} href={m.url} target="_blank" rel="noreferrer" className="block p-3 border rounded-lg hover:bg-gray-50">
                    <p className="font-medium text-gray-900">{m.name}</p>
                    <p className="text-sm text-gray-600">{m.created_at ? formatDate(m.created_at) : '-'}</p>
                  </a>
                ))}
                {materials.length === 0 && <p className="text-sm text-gray-500">Belum ada materi untuk mata kuliah terpilih.</p>}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Sesi Absensi</h2>
              <button onClick={loadSessions} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Refresh</button>
            </div>
            <div className="p-6 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Sesi</label>
                <select value={selectedSessionId} onChange={e => setSelectedSessionId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500">
                  {sessions.map(s => <option key={s.id} value={s.id}>{s.id} • {formatDate(s.created_at)}</option>)}
                </select>
              </div>
              <div className="text-sm text-gray-600">
                <p>Jumlah sesi: {sessions.length}</p>
                <p>Waktu mulai sesi terpilih: {formatDate(sessions.find(x => x.id === selectedSessionId)?.created_at)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Log Kehadiran</h2>
              <div className="flex items-center gap-2">
                <button onClick={loadLogs} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Refresh</button>
                <button onClick={exportCsv} className="px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm">Export CSV</button>
              </div>
            </div>
            <div className="p-6">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-4">Mahasiswa</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Waktu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(l => (
                      <tr key={l.id} className="border-b">
                        <td className="py-2 pr-4">{l.student_id}</td>
                        <td className="py-2 pr-4">{l.status || 'present'}</td>
                        <td className="py-2 pr-4">{l.scanned_at ? formatDate(l.scanned_at) : '-'}</td>
                      </tr>
                    ))}
                    {logs.length === 0 && (
                      <tr><td colSpan={3} className="py-4 text-center text-gray-500">Belum ada log</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-sm text-gray-700">
                <p>Total hadir: {logs.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Kalender Akademik</h2>
          </div>
          <div className="p-6 space-y-3">
            <div className="space-y-2">
              {tasks
                .filter(t => t.deadline)
                .sort((a, b) => new Date(a.deadline || '').getTime() - new Date(b.deadline || '').getTime())
                .map(t => (
                  <div key={t.id} className="p-3 border rounded-lg">
                    <p className="font-medium text-gray-900">{t.title}</p>
                    <p className="text-sm text-gray-600">Tenggat: {new Date(t.deadline || '').toLocaleString('id-ID')}</p>
                  </div>
                ))}
              {sessions.map(s => (
                <div key={s.id} className="p-3 border rounded-lg">
                  <p className="font-medium text-gray-900">Sesi {s.id}</p>
                  <p className="text-sm text-gray-600">Dibuat: {formatDate(s.created_at)}</p>
                </div>
              ))}
              {tasks.filter(t => t.deadline).length === 0 && sessions.length === 0 && (
                <p className="text-sm text-gray-500">Belum ada event kalender.</p>
              )}
            </div>
            <div className="flex gap-2">
              <a href="/analytics/dosen" className="px-4 py-2 bg-secondary text-white rounded-lg">Sistem Penilaian</a>
              <a href="#forum" className="px-4 py-2 bg-gray-800 text-white rounded-lg">Forum Diskusi</a>
            </div>
          </div>
        </div>
      </div>
    </LecturerLayout>
  )
}

export default LecturerDashboard
