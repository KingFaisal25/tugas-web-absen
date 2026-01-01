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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (authError) {
        console.error('Login process error:', authError)
        if (authError.message.includes('Invalid login credentials')) {
          throw new Error('Email atau password salah. Silakan periksa kembali.')
        }
        if (authError.message.includes('Email not confirmed')) {
          throw new Error('Email belum diverifikasi. Silakan cek inbox email Anda.')
        }
        throw authError
      }

      if (authData.user) {
        // 2. Fetch User Profile from Backend or Supabase Fallback
        // Use try-catch specifically for the fetch to distinguish network errors
        let userData: User | { error: string } | null = null
        try {
          const res = await fetch(`${API_BASE_URL}/api/users/${authData.user.id}`)
          if (!res.ok) {
            let errorText = res.statusText
            try {
              const errBody = await res.json()
              if (errBody.error) errorText = errBody.error
            } catch {}
            throw new Error(`Failed to fetch user profile: ${res.status} ${errorText}`)
          }
          userData = await res.json()
        } catch (fetchErr: any) {
           console.error('Fetch profile from backend error:', fetchErr)
           
           // Fallback: Try fetching directly from Supabase if backend is unreachable
           try {
             console.log('Attempting fallback to direct Supabase query...')
             const { data: profileData, error: profileError } = await supabase
               .from('users')
               .select('*')
               .eq('id', authData.user.id)
               .single()
               
             if (profileError) throw profileError
             if (profileData) {
               userData = profileData as User
             } else {
               throw new Error('User profile not found in Supabase')
             }
           } catch (fallbackErr: any) {
             console.error('Fallback profile fetch error:', fallbackErr)
             await supabase.auth.signOut()
             return {
               user: null,
               session: null,
               error: `Gagal menghubungi server: ${fetchErr.message}. Fallback error: ${fallbackErr.message}`
             }
           }
        }

        if (userData && 'error' in userData) {
           await supabase.auth.signOut()
           throw new Error(userData.error)
        }
        
        const user = userData as User

        // 3. Verify Role
        if (user.role !== credentials.role) {
          await supabase.auth.signOut()
          return {
            user: null,
            session: null,
            error: `Role tidak sesuai. Akun ini terdaftar sebagai ${user.role}, bukan ${credentials.role}.`
          }
        }

        return {
          user: user,
          session: authData.session,
          error: null
        }
      }

      return {
        user: null,
        session: null,
        error: 'Login gagal. User tidak ditemukan.'
      }
    } catch (error: any) {
      console.error('Login process error:', error)
      const msg = String(error?.message || '').toLowerCase()
      
      if (msg.includes('email logins are disabled')) {
        return {
          user: null,
          session: null,
          error: 'Metode login Email dinonaktifkan di Supabase. Hubungi administrator.'
        }
      }
      if (msg.includes('invalid login credentials')) {
         return {
          user: null,
          session: null,
          error: 'Email atau password salah.'
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
      const apiRes = await fetch(`${API_BASE_URL}/api/auth/register`, {
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
          (msg.includes('user') && msg.includes('exists'))
          
        if (!isExisting) throw new Error(apiData.error)
        
        // Fallback: email already exists -> try login and ensure profile exists
        const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        })
        if (loginErr) throw loginErr
        
        const authUserId = loginData.user?.id
        if (!authUserId) throw new Error('User terdaftar tetapi tidak dapat mengambil user ID')
        
        // Try creating profile if missing (ignore duplicates)
        try {
          await fetch(`${API_BASE_URL}/api/users`, {
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
        
        // Fetch profile
        const profileRes = await fetch(`${API_BASE_URL}/api/users/${authUserId}`)
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
      
      const profileRes = await fetch(`${API_BASE_URL}/api/users/${authUserId}`)
      const userData = await profileRes.json()

      return {
        user: userData as User,
        session: loginData.session,
        error: null
      }
    } catch (error: any) {
      return {
        user: null,
        session: null,
        error: error.message || 'Gagal melakukan registrasi'
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

      // Try fetching from backend first
      try {
        const res = await fetch(`${API_BASE_URL}/api/users/${authUser.id}`)
        if (!res.ok) throw new Error('Backend fetch failed')
        const userData = await res.json()
        if (userData?.error) throw new Error(userData.error)
        return userData as User
      } catch (backendError) {
        console.warn('Backend unavailable, falling back to direct Supabase query for getCurrentUser', backendError)
        // Fallback to direct Supabase query
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()
        
        if (error || !data) {
           console.error('Supabase fallback failed', error)
           return null
        }
        return data as User
      }
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
