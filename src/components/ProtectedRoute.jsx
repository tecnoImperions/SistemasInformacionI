import { useEffect, useState, createContext, useContext } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { supabase, getUserProfile } from '../lib/supabase'
import { Loader2 } from 'lucide-react'

// Contexto global de autenticación
const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}

/**
 * AuthProvider — envuelve la app y provee sesión + perfil del usuario
 */
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user) {
        loadProfile(s.user.id)
      } else {
        setLoading(false)
      }
    })

    // Escuchar cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, s) => {
        setSession(s)
        if (s?.user) {
          await loadProfile(s.user.id)
        } else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId) {
    try {
      const p = await getUserProfile(userId)
      setProfile(p)
    } catch (err) {
      // Si no tiene perfil aún (raro, pero posible), crear un perfil mínimo
      console.warn('No se pudo cargar perfil:', err.message)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAuthenticated: !!session,
    rolNombre: profile?.roles?.nombre ?? 'CONSULTA',
    refreshProfile: () => session?.user && loadProfile(session.user.id),
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * ProtectedRoute — redirige a /login si no hay sesión activa
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <Loader2 size={36} className="loading-spinner" />
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}
