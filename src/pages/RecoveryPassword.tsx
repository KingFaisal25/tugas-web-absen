import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { KeyIcon } from '@heroicons/react/24/outline'
import { authService } from '../services/AuthService.ts'

const RecoveryPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const isValidEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null); setError(null)
    if (!isValidEmail(email)) { setError('Format email tidak valid'); return }
    setLoading(true)
    const res = await authService.requestPasswordReset(email.trim())
    if (res.error) setError(res.error)
    else setStatus('Tautan pemulihan telah dikirim ke email Anda.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="px-6 py-6 border-b flex items-center gap-3">
          <KeyIcon className="h-7 w-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pemulihan Password</h1>
            <p className="text-sm text-gray-600">Masukkan email untuk menerima tautan pemulihan</p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {status && <div className="p-3 bg-green-50 border border-green-200 rounded text-green-700 text-sm">{status}</div>}
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{error}</div>}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="nama@kampus.ac.id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-invalid={email.length > 0 && !isValidEmail(email)}
              />
              {email.length > 0 && !isValidEmail(email) && (
                <p className="text-xs text-red-600 mt-1">Format email tidak valid</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !isValidEmail(email)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Mengirim...' : 'Kirim Tautan Pemulihan'}
            </button>
          </form>
          <div className="text-sm text-gray-600">
            <p>Sudah ingat password? <Link to="/login/mahasiswa" className="text-blue-600 hover:text-blue-700">Kembali ke login</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecoveryPassword
