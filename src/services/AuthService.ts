import { supabase } from '../config/supabase.ts'
import type { User, UserRole } from '../config/supabase.ts'

export interface LoginCredentials {
  email: string
  password: string
  role: UserRole
}

export interface RegisterCredentials {
  email: string
  password: string
  fullName: string
  role: UserRole
  npm?: string
  nidn?: string
  phone?: string
  programStudi?: string
}

export interface AuthResponse {
  user: User | null
  session: any | null
  error: string | null
}

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (authError) throw authError

      if (authData.user) {
        const res = await fetch(`http://localhost:3000/api/users/${authData.user.id}`)
        const userData = await res.json()
        if (userData?.error) throw new Error(userData.error)

        if ((userData as User).role !== credentials.role) {
          await supabase.auth.signOut()
          return {
            user: null,
            session: null,
            error: 'Role tidak sesuai. Silakan login dengan role yang benar.'
          }
        }

        return {
          user: userData as User,
          session: authData.session,
          error: null
        }
      }

      return {
        user: null,
        session: null,
        error: 'Login gagal'
      }
    } catch (error: any) {
      const msg = String(error?.message || '').toLowerCase()
      if (msg.includes('email logins are disabled')) {
        return {
          user: null,
          session: null,
          error: 'Metode login Email dinonaktifkan di Supabase. Aktifkan Email Provider di Dashboard → Authentication → Providers, atau gunakan metode login alternatif.'
        }
      }
      return {
        user: null,
        session: null,
        error: error.message || 'Terjadi kesalahan saat login'
      }
    }
  }

  async register(credentials: RegisterCredentials): Promise<AuthResponse> {
    try {
      // Use backend to create auth user (auto-confirm dev) and DB profile
      const apiRes = await fetch('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: credentials.email,
          password: credentials.password,
          fullName: credentials.fullName,
          role: credentials.role,
          npm: credentials.npm,
          nidn: credentials.nidn
        })
      })
      const apiData = await apiRes.json()
      if (apiData?.error) {
        const msg = String(apiData.error).toLowerCase()
        const isExisting =
          msg.includes('already') ||
          msg.includes('exists') ||
          msg.includes('registered') ||
          msg.includes('user') && msg.includes('exists')
        if (!isExisting) throw new Error(apiData.error)
        // Fallback: email sudah terdaftar -> lakukan login dan pastikan profile tersedia
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })
        if (loginErr) throw loginErr
        const authUserId = loginData.user?.id
        if (!authUserId) throw new Error('User terdaftar tetapi tidak dapat mengambil user ID')
        // Coba membuat profile jika belum ada (abaikan jika duplikat)
        try {
          await fetch('http://localhost:3000/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: authUserId,
              email: credentials.email,
              fullName: credentials.fullName,
              role: credentials.role,
              npm: credentials.npm,
              nidn: credentials.nidn
            })
          })
        } catch {}
        // Ambil profile
        const profileRes = await fetch(`http://localhost:3000/api/users/${authUserId}`)
        const userData = await profileRes.json()
        return {
          user: userData as User,
          session: loginData.session,
          error: null
        }
      }

      // Auto login after successful registration
      const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })
      if (loginErr) throw loginErr

      // Fetch profile using auth user id
      const authUserId = loginData.user?.id
      if (!authUserId) throw new Error('Registrasi berhasil tetapi tidak dapat mengambil user ID')
      const profileRes = await fetch(`http://localhost:3000/api/users/${authUserId}`)
      const userData = await profileRes.json()
      if (userData?.error) throw new Error(userData.error)

      return {
        user: userData as User,
        session: loginData.session,
        error: null
      }
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: error.message || 'Terjadi kesalahan saat registrasi'
      }
    }
  }

  async logout(): Promise<void> {
    try {
      await supabase.auth.signOut()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  async requestPasswordReset(email: string): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/recovery-password`
      })
      if (error) throw error
      return { error: null }
    } catch (e: any) {
      return { error: e.message || 'Gagal mengirim tautan pemulihan' }
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) return null

      const res = await fetch(`http://localhost:3000/api/users/${authUser.id}`)
      const userData = await res.json()
      if (userData?.error) return null

      return userData as User
    } catch (error) {
      console.error('Get current user error:', error)
      return null
    }
  }

  async updatePassword(email: string, newPassword: string, otpCode: string): Promise<{ error: string | null }> {
    try {
      // First verify OTP code (you would implement OTP verification logic here)
      // For now, we'll use Supabase's built-in password recovery
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error

      return { error: null }
    } catch (error: any) {
      return { error: error.message || 'Gagal memperbarui password' }
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}

export const authService = new AuthService()
