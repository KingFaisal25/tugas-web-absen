import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { EyeIcon, EyeSlashIcon, UserGroupIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  onSwitchToStudent?: () => void
  onSwitchToRegister?: () => void
}

const LecturerLogin: React.FC<Props> = (_props) => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuth()
  const navigate = useNavigate()
  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  const isValidPassword = (val: string) => val.length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!isValidEmail(email)) {
      setError('Format email tidak valid')
      setLoading(false)
      return
    }

    if (!isValidPassword(password)) {
      setError('Password harus minimal 6 karakter')
      setLoading(false)
      return
    }

    const result = await login(email.trim(), password, 'dosen')
    
    if (result.error) {
      setError(result.error)
    } else {
      navigate('/dashboard/dosen')
    }
    
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-8 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-white bg-opacity-20 rounded-full p-3">
                <UserGroupIcon className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">
              Portal Dosen
            </h1>
            <p className="text-purple-100">
              Masuk untuk mengelola perkuliahan dan absensi
            </p>
          </div>

          {/* Form */}
          <div className="px-6 py-8">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Dosen
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                  placeholder="dosen@kampus.ac.id"
                />
                {email.length > 0 && !isValidEmail(email) && (
                  <p className="text-xs text-red-600 mt-1">Format email tidak valid</p>
                )}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors"
                    placeholder="Masukkan password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="h-5 w-5" />
                    ) : (
                      <EyeIcon className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Link
                  to="/recovery-password"
                  className="text-sm text-purple-600 hover:text-purple-500 transition-colors"
                >
                  Lupa Password?
                </Link>
                <Link
                  to="/login/mahasiswa"
                  className="text-sm text-gray-600 hover:text-gray-500 transition-colors"
                >
                  Login sebagai Mahasiswa
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading || !isValidEmail(email)}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Memproses...' : 'Masuk'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Belum punya akun?{' '}
                <Link
                  to="/register/dosen"
                  className="text-purple-600 hover:text-purple-500 font-medium transition-colors"
                >
                  Daftar di sini
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            © 2024 Platform Akademik. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LecturerLogin
