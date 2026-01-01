import React, { useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { LangProvider } from './i18n'
import { AccessibilityProvider } from './contexts/AccessibilityContext'
import Home from './pages/Home'
import RecoveryPassword from './pages/RecoveryPassword'
import { useAuth } from './contexts/AuthContext'
import { supabase } from './config/supabase.ts'

const StudentLogin = lazy(() => import('./components/auth/StudentLogin'))
const LecturerLogin = lazy(() => import('./components/auth/LecturerLogin'))
const StudentRegister = lazy(() => import('./components/auth/StudentRegister'))
const LecturerRegister = lazy(() => import('./components/auth/LecturerRegister'))
const LecturerDashboard = lazy(() => import('./pages/LecturerDashboard'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
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
                    <Suspense fallback={<div className="p-6">Loading...</div>}><StudentDashboard /></Suspense>
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
