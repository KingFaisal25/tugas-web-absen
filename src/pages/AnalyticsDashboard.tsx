import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

type SessionItem = { id: string; created_at: string }
type LogItem = { id: string; session_id: string }

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth()
  const apiBase = useMemo(() => 'http://localhost:3000', [])
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const [courses, setCourses] = useState<{ id: string; code: string; name: string }[]>([])
  const [data, setData] = useState<{ name: string; value: number }[]>([])

  useEffect(() => { loadCourses() }, [user])
  useEffect(() => { if (selectedCourseId) loadSessions() }, [selectedCourseId])
  useEffect(() => { if (sessions.length) aggregate() }, [sessions])

  const loadCourses = async () => {
    if (!user) return
    const res = await fetch(`${apiBase}/api/courses?dosenId=${encodeURIComponent(user.id)}`)
    const d = await res.json()
    if (Array.isArray(d)) {
      setCourses(d)
      if (d.length) setSelectedCourseId(d[0].id)
    }
  }

  const loadSessions = async () => {
    const res = await fetch(`${apiBase}/api/attendance/sessions?courseId=${encodeURIComponent(selectedCourseId)}`)
    const d = await res.json()
    setSessions(Array.isArray(d) ? d : [])
  }

  const aggregate = async () => {
    const counts: Record<string, number> = {}
    for (const s of sessions) {
      const res = await fetch(`${apiBase}/api/attendance/logs?sessionId=${encodeURIComponent(s.id)}`)
      const logs: LogItem[] = await res.json()
      counts[s.id] = Array.isArray(logs) ? logs.length : 0
    }
    const arr = Object.entries(counts).map(([id, value]) => ({ name: id.slice(0, 6), value }))
    setData(arr)
  }

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Analitik</h1>
          <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="px-3 py-2 border rounded">
            {courses.map(c => <option key={c.id} value={c.id}>{c.code} • {c.name}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#6366F1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AnalyticsDashboard
