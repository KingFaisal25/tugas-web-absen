import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../config/supabase'
import StudentLayout from '../components/layout/StudentLayout'

const StudentDashboard: React.FC = () => {
  const { user } = useAuth()
  const apiBase = useMemo(() => import.meta.env.VITE_API_URL || 'http://localhost:3000', [])
  
  // State for QR and Attendance
  const [qrText, setQrText] = useState('')
  const [npm, setNpm] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  
  // State for Academics
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [materials, setMaterials] = useState<{ name: string; url: string; created_at?: string }[]>([])
  const [assignments, setAssignments] = useState<{ id: string; title: string; description: string; due_date: string; status: string }[]>([])
  
  // State for Uploads
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  
  // State for Profile
  const [tasks, setTasks] = useState<{ id: string; title: string; description?: string; deadline?: string; priority?: string }[]>([])
  const [gpa, setGpa] = useState<number | null>(null)
  const [progressCourses, setProgressCourses] = useState<number>(0)

  // --- QR & Attendance Logic ---
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
      
      // Feature detection for BarcodeDetector
      if ('BarcodeDetector' in window) {
        const Detector = (window as any).BarcodeDetector
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
        setError('Peramban tidak mendukung kamera scanner native, gunakan input manual atau pastikan fitur eksperimental aktif.')
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

  // --- Data Loading Logic ---
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
        if (data.length > 0 && !selectedCourseId) setSelectedCourseId(data[0].id)
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

  const loadAssignments = async () => {
    if (!selectedCourseId) return
    try {
      const res = await fetch(`${apiBase}/api/assignments?courseId=${selectedCourseId}`)
      const data = await res.json()
      if (Array.isArray(data)) setAssignments(data)
      else setAssignments([])
    } catch (e) {
      console.error('Failed to load assignments', e)
    }
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
        loadMaterials() // Refresh materials list if it shows uploads
      } else {
        setError(d.error)
      }
    } catch (e: any) {
      setError(e.message || 'Gagal upload tugas')
    } finally {
      setUploading(false)
    }
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

  // --- Effects ---
  useEffect(() => { loadCourses() }, [])
  
  useEffect(() => {
    if (selectedCourseId) {
      loadMaterials()
      loadAssignments()
      
      // Real-time subscription for assignments
      const channel = supabase
        .channel(`assignments:${selectedCourseId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'assignments', 
          filter: `course_id=eq.${selectedCourseId}` 
        }, () => {
          loadAssignments()
        })
        .subscribe()
        
      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [selectedCourseId])

  useEffect(() => { loadProfileMetrics() }, [user, courses])

  return (
    <StudentLayout title="Dashboard Mahasiswa" onFabClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
      {status && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{status}</div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Progress Card */}
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
              <p className="text-sm text-gray-600">SKS Diambil</p>
              <p className="text-2xl font-semibold text-primary">24</p>
            </div>
          </div>
        </div>

        {/* Attendance Card */}
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

        {/* Course & Assignments Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 lg:col-span-2">
          <div className="px-6 py-6 border-b flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Perkuliahan</h1>
              <p className="text-gray-600">Pilih mata kuliah untuk melihat tugas dan materi</p>
            </div>
            <select 
              value={selectedCourseId} 
              onChange={e => setSelectedCourseId(e.target.value)} 
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[200px]"
            >
              <option value="" disabled>Pilih Mata Kuliah</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
            </select>
          </div>
          
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column: Assignments */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <span className="p-1 bg-blue-100 rounded text-blue-600">📝</span>
                Daftar Tugas
              </h3>
              <div className="space-y-3">
                {assignments.length > 0 ? (
                  assignments.map(a => (
                    <div key={a.id} className="p-4 border rounded-lg hover:border-blue-300 transition-colors bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{a.title}</h4>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{a.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Batas: {new Date(a.due_date).toLocaleString('id-ID')}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center border-2 border-dashed rounded-lg text-gray-500">
                    <p>Belum ada tugas untuk mata kuliah ini.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Materials & Upload */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-gray-800 flex items-center gap-2">
                <span className="p-1 bg-purple-100 rounded text-purple-600">📚</span>
                Materi & Pengumpulan
              </h3>
              
              {/* Upload Section */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <label className="block text-sm font-medium text-gray-700 mb-2">Kumpul Tugas</label>
                <div className="flex gap-2">
                  <input type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                  <button onClick={uploadAssignment} disabled={uploading || !file} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
                    {uploading ? '...' : 'Upload'}
                  </button>
                </div>
              </div>

              {/* Materials List */}
              <div className="space-y-3">
                {materials.map(m => (
                  <a key={m.name} href={m.url} target="_blank" rel="noreferrer" className="flex items-center p-3 border rounded-lg hover:bg-gray-50 transition-colors group">
                    <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center mr-3 group-hover:bg-white group-hover:shadow-sm">
                      📄
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{m.name}</p>
                      <p className="text-xs text-gray-500">{m.created_at ? new Date(m.created_at).toLocaleDateString('id-ID') : '-'}</p>
                    </div>
                    <span className="text-blue-600 text-sm">Buka</span>
                  </a>
                ))}
                {materials.length === 0 && <p className="text-sm text-gray-500">Belum ada materi tersedia.</p>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}

export default StudentDashboard
