import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '../services/AuthService.ts'
import type { User, UserRole } from '../config/supabase.ts'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string, role: UserRole) => Promise<{ error: string | null }>
  register: (userData: any) => Promise<{ error: string | null }>
  logout: () => Promise<void>
  updatePassword: (email: string, newPassword: string, otpCode: string) => Promise<{ error: string | null }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for existing session on mount
    checkUser()

    // Listen for auth changes
    const { data: authListener } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        checkUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const checkUser = async () => {
    try {
      setLoading(true)
      const currentUser = await authService.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error checking user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string, role: UserRole) => {
    try {
      setLoading(true)
      const result = await authService.login({ email, password, role })
      
      if (result.error) {
        return { error: result.error }
      }

      if (result.user) {
        setUser(result.user)
        return { error: null }
      }

      return { error: 'Login gagal' }
    } catch (error) {
      console.error('Login error:', error)
      return { error: 'Terjadi kesalahan saat login' }
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: any) => {
    try {
      setLoading(true)
      const result = await authService.register(userData)
      
      if (result.error) {
        return { error: result.error }
      }

      if (result.user) {
        setUser(result.user)
        return { error: null }
      }

      return { error: 'Registrasi gagal' }
    } catch (error) {
      console.error('Register error:', error)
      return { error: 'Terjadi kesalahan saat registrasi' }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      setLoading(true)
      await authService.logout()
      setUser(null)
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setLoading(false)
    }
  }

  const updatePassword = async (email: string, newPassword: string, otpCode: string) => {
    return await authService.updatePassword(email, newPassword, otpCode)
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updatePassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
