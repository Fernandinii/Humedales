import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { AUTH_TOKEN_KEY, AUTH_USER_KEY, fetchMe, login as loginRequest } from '../services/api'
import type { Usuario } from '../types'

interface AuthContextValue {
  user: Usuario | null
  token: string | null
  loading: boolean
  isAuthenticated: boolean
  login: (correo: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

function readStoredUser(): Usuario | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(AUTH_USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as Usuario
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    typeof localStorage !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) : null,
  )
  const [user, setUser] = useState<Usuario | null>(() => readStoredUser())
  const [loading, setLoading] = useState<boolean>(() => Boolean(token))

  useEffect(() => {
    let active = true

    if (!token) {
      return () => {
        active = false
      }
    }

    fetchMe()
      .then((profile) => {
        if (!active) return
        setUser(profile)
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile))
      })
      .catch(() => {
        if (!active) return
        localStorage.removeItem(AUTH_TOKEN_KEY)
        localStorage.removeItem(AUTH_USER_KEY)
        setToken(null)
        setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [token])

  const login = async (correo: string, password: string) => {
    const response = await loginRequest(correo, password)
    localStorage.setItem(AUTH_TOKEN_KEY, response.access_token)
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(response.usuario))
    setToken(response.access_token)
    setUser(response.usuario)
  }

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY)
    localStorage.removeItem(AUTH_USER_KEY)
    setToken(null)
    setUser(null)
    setLoading(false)
  }

  const hasRole = (...roles: string[]) =>
    Boolean(user?.rol_nombre && roles.includes(user.rol_nombre))

  const value: AuthContextValue = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
    hasRole,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider')
  }
  return context
}
