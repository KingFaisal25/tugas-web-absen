import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LangProvider } from './i18n'
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import Home from './pages/Home'
import RecoveryPassword from './pages/RecoveryPassword'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './config/supabase.ts'
import StudentLayout from './components/layout/StudentLayout'
const StudentLogin = lazy(() => import('./components/auth/StudentLogin'))
const LecturerLogin = lazy(() => import('./components/auth/LecturerLogin'))
const StudentRegister = lazy(() => import('./components/auth/StudentRegister'))
const LecturerRegister = lazy(() => import('./components/auth/LecturerRegister'))
const LecturerDashboard = lazy(() => import('./pages/LecturerDashboard'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))

// Protected Route Component
interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: string[]
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  if (!user) return <Navigate to="/" replace />
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) return <Navigate to="/" replace />
  return <>{children}</>
}

const StudentAttendance: React.FC = () => {
  const { user } = useAuth()
  const apiBase = useMemo(() => 'http://localhost:3000', [])
  const [qrText, setQrText] = useState('')
  const [npm, setNpm] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [materials, setMaterials] = useState<{ name: string; url: string; created_at?: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [tasks, setTasks] = useState<{ id: string; title: string; description?: string; deadline?: string; priority?: string }[]>([])
  const [gpa, setGpa] = useState<number | null>(null)
  const [progressCourses, setProgressCourses] = useState<number>(0)

  const startScan = async () => {
    setError(null); setStatus(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)
      const Detector = (window as any).BarcodeDetector
      if (Detector) {
        const detector = new Detector({ formats: ['qr_code'] })
        const interval = setInterval(async () => {
          if (!videoRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes && codes.length > 0) {
              const text = codes[0].rawValue || codes[0].data || ''
              if (text) {
                setQrText(text)
                stopScan()
                clearInterval(interval)
              }
            }
          } catch {}
        }, 500)
      } else {
        setError('Peramban tidak mendukung kamera scanner, gunakan input manual')
      }
    } catch (e: any) {
      setError(e.message || 'Tidak dapat mengakses kamera')
    }
  }

  const stopScan = () => {
    setScanning(false)
    if (videoRef.current) videoRef.current.pause()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const submitAttendance = async () => {
    setStatus(null); setError(null)
    try {
      const sessionToken = qrText.trim()
      const cleanNpm = npm.trim()
      if (!/^\d{6,}$/.test(cleanNpm)) { setError('Format NPM tidak valid'); return }
      const res = await fetch(`${apiBase}/api/attendance/scan-npm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ npm: cleanNpm, sessionToken })
      })
      const data = await res.json()
      if (data?.error) { setError(data.error); return }
      setStatus('Presensi berhasil tercatat')
    } catch (e: any) {
      setError(e.message || 'Gagal presensi')
    }
  }

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || null
  }

  const loadCourses = async () => {
    try {
      const res = await fetch(`${apiBase}/api/courses`)
      const data = await res.json()
      if (Array.isArray(data)) {
        setCourses(data)
        if (data.length > 0) setSelectedCourseId(data[0].id)
      }
    } catch {}
  }

  const loadMaterials = async () => {
    if (!selectedCourseId) return
    try {
      const params = new URLSearchParams({ courseId: selectedCourseId })
      const res = await fetch(`${apiBase}/api/materials/list?${params.toString()}`)
      const data = await res.json()
      if (Array.isArray(data)) setMaterials(data)
    } catch {}
  }

  const uploadAssignment = async () => {
    if (!file || !selectedCourseId) return
    setUploading(true)
    try {
      const token = await getAccessToken()
      const form = new FormData()
      form.append('file', file)
      form.append('courseId', selectedCourseId)
      const res = await fetch(`${apiBase}/api/materials/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: form
      })
      const d = await res.json()
      if (!d?.error) {
        setStatus('Pengumpulan tugas berhasil')
        setFile(null)
        loadMaterials()
      } else {
        setError(d.error)
      }
    } catch (e: any) {
      setError(e.message || 'Gagal upload tugas')
    } finally {
      setUploading(false)
    }
  }

  const loadTasks = async () => {
    if (!user) return
    try {
      const res = await fetch(`${apiBase}/api/tasks?userId=${encodeURIComponent(user.id)}`)
      const data = await res.json()
      if (Array.isArray(data)) setTasks(data)
    } catch {}
  }

  const loadProfileMetrics = async () => {
    if (!user) return
    try {
      const res = await fetch(`${apiBase}/api/users/${user.id}`)
      const data = await res.json()
      if (data?.gpa) setGpa(Number(data.gpa))
      else setGpa(null)
      setProgressCourses(courses.length)
    } catch {}
  }

  useEffect(() => { loadCourses() }, [])
  useEffect(() => { loadMaterials() }, [selectedCourseId])
  useEffect(() => { loadTasks() }, [user])
  useEffect(() => { loadProfileMetrics() }, [user, courses])

  return (
    <StudentLayout title="Dashboard Mahasiswa" onFabClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      {status && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{status}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Progress Akademik</h1>
            <p className="text-gray-600">IPK, progress mata kuliah, dan capaian</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600">IPK</p>
              <p className="text-2xl font-semibold text-primary">{gpa !== null ? gpa.toFixed(2) : '-'}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600">Mata Kuliah</p>
              <p className="text-2xl font-semibold text-primary">{progressCourses}</p>
            </div>
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-gray-600">Capaian</p>
              <p className="text-2xl font-semibold text-primary">-</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Presensi QR</h1>
            <p className="text-gray-600">Scan atau tempel token sesi dan masukkan NPM</p>
          </div>
          <div className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                {!scanning ? (
                  <button onClick={startScan} className="px-3 py-2 bg-gray-800 text-white rounded">Scan QR</button>
                ) : (
                  <button onClick={stopScan} className="px-3 py-2 bg-gray-500 text-white rounded">Stop</button>
                )}
              </div>
              {scanning && (
                <div className="rounded overflow-hidden border">
                  <video ref={videoRef} className="w-full h-64 object-cover" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data QR (token sesi)</label>
              <input value={qrText} onChange={e => setQrText(e.target.value)} placeholder="Tempel token sesi dari QR" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">NPM</label>
              <input value={npm} onChange={e => setNpm(e.target.value)} placeholder="Masukkan NPM" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div className="flex justify-end">
              <button onClick={submitAttendance} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500">Presensi</button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-6 border-b flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Materi Perkuliahan</h1>
              <p className="text-gray-600">Akses materi terorganisir</p>
            </div>
            <button onClick={loadMaterials} className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200 text-sm">Refresh</button>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Mata Kuliah</label>
                <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                  {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div className="flex justify-end">
              <button onClick={uploadAssignment} disabled={uploading || !file} className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 focus:ring-2 focus:ring-primary disabled:opacity-60 disabled:cursor-not-allowed">
                {uploading ? 'Mengunggah...' : 'Upload Tugas'}
              </button>
            </div>
            <div className="space-y-3">
              {materials.map(m => (
                <a key={m.name} href={m.url} target="_blank" rel="noreferrer" className="block p-3 border rounded-lg hover:bg-gray-50">
                  <p className="font-medium text-gray-900">{m.name}</p>
                  <p className="text-sm text-gray-600">{m.created_at || '-'}</p>
                </a>
              ))}
              {materials.length === 0 && <p className="text-sm text-gray-500">Belum ada materi untuk mata kuliah terpilih.</p>}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
          <div className="px-6 py-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Tugas dan Nilai</h1>
            <p className="text-gray-600">Lihat tugas, status, dan feedback</p>
          </div>
          <div className="p-6 space-y-3">
            {tasks.map(t => (
              <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.title}</p>
                  <p className="text-sm text-gray-600">{t.description || '-'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-600">Batas: {t.deadline ? new Date(t.deadline).toLocaleString('id-ID') : '-'}</p>
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">{t.priority || 'normal'}</span>
                </div>
              </div>
            ))}
            {tasks.length === 0 && <p className="text-sm text-gray-500">Belum ada tugas terdaftar.</p>}
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}

function App() {
  return (
    <LangProvider>
      <AccessibilityProvider>
        <AuthProvider>
          <Router>
          <div className="App">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login/mahasiswa" element={<Suspense fallback={<div className="p-6">Loading...</div>}><StudentLogin /></Suspense>} />
              <Route path="/login/dosen" element={<Suspense fallback={<div className="p-6">Loading...</div>}><LecturerLogin /></Suspense>} />
              <Route path="/register/mahasiswa" element={<Suspense fallback={<div className="p-6">Loading...</div>}><StudentRegister /></Suspense>} />
              <Route path="/register/dosen" element={<Suspense fallback={<div className="p-6">Loading...</div>}><LecturerRegister /></Suspense>} />
              <Route path="/recovery-password" element={<RecoveryPassword />} />
              <Route 
                path="/dashboard/mahasiswa" 
                element={
                  <ProtectedRoute allowedRoles={['mahasiswa']}>
                    <Suspense fallback={<div className="p-6">Loading...</div>}><StudentAttendance /></Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/dosen" 
                element={
                  <ProtectedRoute allowedRoles={['dosen']}>
                    <Suspense fallback={<div className="p-6">Loading...</div>}><LecturerDashboard /></Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/analytics/dosen" 
                element={
                  <ProtectedRoute allowedRoles={['dosen']}>
                    <Suspense fallback={<div className="p-6">Loading...</div>}><AnalyticsDashboard /></Suspense>
                  </ProtectedRoute>
                } 
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          </Router>
        </AuthProvider>
      </AccessibilityProvider>
    </LangProvider>
  )
}

export default App
