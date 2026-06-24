import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Mail, Lock, Eye, EyeOff, LogIn, Loader2, UserPlus, User } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  
  // Form fields
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    try {
      if (isLogin) {
        // FLUJO DE LOGIN
        const { error: authError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })

        if (authError) {
          if (authError.message.includes('Invalid login')) {
            setError('Correo o contraseña incorrectos')
          } else if (authError.message.includes('Email not confirmed')) {
            setError('Tu correo aún no ha sido confirmado. Revisa tu bandeja de entrada.')
          } else {
            setError(authError.message)
          }
          setLoading(false)
          return
        }

        navigate('/', { replace: true })
      } else {
        // FLUJO DE REGISTRO
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden')
          setLoading(false)
          return
        }
        
        if (password.length < 6) {
          setError('La contraseña debe tener al menos 6 caracteres')
          setLoading(false)
          return
        }

        if (!nombre.trim()) {
          setError('El nombre completo es requerido')
          setLoading(false)
          return
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: nombre.trim()
            }
          }
        })

        if (signUpError) {
          if (signUpError.message.includes('User already registered')) {
            setError('Este correo ya está registrado.')
          } else {
            setError(signUpError.message)
          }
        } else {
          setSuccess('Cuenta creada. Revisa tu correo para confirmar.')
          setIsLogin(true)
          setPassword('')
          setConfirmPassword('')
        }
        setLoading(false)
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
      setLoading(false)
    }
  }

  async function handleGoogleLogin() {
    setError(null)
    setGoogleLoading(true)

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      })

      if (authError) {
        setError('No se pudo iniciar sesión con Google. Intenta de nuevo.')
      }
    } catch (err) {
      setError('Error de conexión. Intenta de nuevo.')
    } finally {
      setGoogleLoading(false)
    }
  }

  function toggleMode() {
    setIsLogin(!isLogin)
    setError(null)
    setSuccess(null)
    setPassword('')
    setConfirmPassword('')
  }

  return (
    <div className="login-page">
      {/* Decorative background elements */}
      <div className="login-bg-decoration">
        <div className="login-bg-circle login-bg-circle--1" />
        <div className="login-bg-circle login-bg-circle--2" />
        <div className="login-bg-circle login-bg-circle--3" />
      </div>

      <div className="login-card">
        {/* Logo / Brand */}
        <div className="login-brand">
          <div className="login-logo">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <rect width="44" height="44" rx="12" fill="#0F6E56"/>
              <path d="M12 16h20M12 22h14M12 28h18" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="33" cy="28" r="4" fill="#1D9E75" stroke="#fff" strokeWidth="1.5"/>
            </svg>
          </div>
          <h1 className="login-title">IPCB IMPORT</h1>
          <p className="login-subtitle">Sistema de Gestión Empresarial</p>
        </div>

        {/* Mensajes de feedback */}
        {error && (
          <div className="login-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="login-error" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M11 5.5l-4 4.5-2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{success}</span>
          </div>
        )}

        {/* Email/Password form */}
        <form onSubmit={handleSubmit} className="login-form">
          
          {!isLogin && (
            <div className="login-field">
              <label htmlFor="login-nombre" className="login-label">
                Nombre completo
              </label>
              <div className="login-input-wrapper">
                <User size={18} className="login-input-icon" />
                <input
                  id="login-nombre"
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Juan Pérez"
                  required
                  className="login-input"
                />
              </div>
            </div>
          )}

          <div className="login-field">
            <label htmlFor="login-email" className="login-label">
              Correo electrónico
            </label>
            <div className="login-input-wrapper">
              <Mail size={18} className="login-input-icon" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                required
                autoComplete="email"
                className="login-input"
              />
            </div>
          </div>

          <div className="login-field">
            <label htmlFor="login-password" className="login-label">
              Contraseña
            </label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className="login-input"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="login-toggle-pw"
                tabIndex={-1}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="login-field">
              <label htmlFor="login-confirm-password" className="login-label">
                Confirmar Contraseña
              </label>
              <div className="login-input-wrapper">
                <Lock size={18} className="login-input-icon" />
                <input
                  id="login-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="login-input"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-btn login-btn--primary"
          >
            {loading ? (
              <Loader2 size={20} className="login-spinner" />
            ) : isLogin ? (
              <LogIn size={20} />
            ) : (
              <UserPlus size={20} />
            )}
            <span>{loading ? 'Procesando...' : isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}</span>
          </button>
        </form>

        <div className="text-center mt-4">
          <button
            type="button"
            onClick={toggleMode}
            className="text-sm font-medium text-[#0F6E56] hover:underline"
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia Sesión'}
          </button>
        </div>

        {/* Divider */}
        <div className="login-divider">
          <span>o continuar con</span>
        </div>

        {/* Google Login */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading}
          className="login-btn login-btn--google"
        >
          {googleLoading ? (
            <Loader2 size={20} className="login-spinner" />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          )}
          <span>{googleLoading ? 'Conectando...' : 'Google'}</span>
        </button>

        {/* Footer */}
        <p className="login-footer">
          IPCB IMPORT © {new Date().getFullYear()} — Santa Cruz, Bolivia
        </p>
      </div>
    </div>
  )
}
