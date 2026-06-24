import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/ProtectedRoute'
import { alertSuccess, alertError, alertConfirm } from '../../../lib/alerts'
import { X, UserPlus, User, Phone, CreditCard, AlertTriangle, Loader2 } from 'lucide-react'

export default function ClienteForm({ isOpen, onClose, onSuccess, initialNombre = '' }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)

  const [nombre, setNombre] = useState('')
  const [telefono, setTelefono] = useState('')
  const [nitCi, setNitCi] = useState('')

  const [sugerencias, setSugerencias] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setNombre(initialNombre)
      setTelefono('')
      setNitCi('')
      setSugerencias([])
      setTimeout(() => {
        if (inputRef.current) inputRef.current.focus()
      }, 50)
    }
  }, [isOpen, initialNombre])

  // Detección de duplicados (debounce 400ms)
  useEffect(() => {
    if (!nombre.trim() || nombre.trim().length <= 3) {
      setSugerencias([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const val = nombre.trim()
        const { data, error } = await supabase
          .from('clientes')
          .select('id, nombre, empresa, telefono')
          .or(`nombre.ilike.%${val}%,empresa.ilike.%${val}%`)
          .limit(3)
        
        if (error) throw error
        setSugerencias(data || [])
      } catch (err) {
        console.error('Error al buscar duplicados:', err)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [nombre])

  const getInicialesAvatar = (texto) => {
    const p = texto.trim().split(' ')
    if (p.length >= 2) return (p[0][0] + p[1][0]).toUpperCase()
    return texto.substring(0, 2).toUpperCase()
  }

  const getInicialesCodigo = (texto) => {
    const palabras = texto.trim().split(' ')
    if (palabras.length >= 2) {
      return (palabras[palabras.length-1]).substring(0,3).toUpperCase()
    }
    return texto.substring(0,3).toUpperCase()
  }

  async function generateCodigo(nombreCliente) {
    const { count } = await supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true })

    const prefijo = getInicialesCodigo(nombreCliente)
    
    // Para asegurar que no falle por unique constraint, buscamos el primero libre
    let numero = (count || 0) + 1
    let codigoFinal = ''
    let isUnique = false

    while (!isUnique) {
      codigoFinal = `${prefijo}-${String(numero).padStart(3, '0')}`
      const { data } = await supabase.from('clientes').select('id').eq('codigo', codigoFinal).limit(1)
      if (data && data.length > 0) {
        numero++
      } else {
        isUnique = true
      }
    }
    return codigoFinal
  }

  async function handleSubmit() {
    if (!nombre.trim()) return

    if (sugerencias.length > 0) {
      const resp = await alertConfirm(
        '¿Crear cliente nuevo?',
        'Encontramos clientes con nombre similar. ¿Seguro que deseas crear uno nuevo?',
        'Sí, crear nuevo',
        'Revisar existentes'
      )
      if (!resp.isConfirmed) return
    }

    setLoading(true)
    try {
      const codigoFinal = await generateCodigo(nombre)

      const { error } = await supabase.from('clientes').insert([
        {
          codigo: codigoFinal,
          nombre: nombre.trim(),
          telefono: telefono.trim() || null,
          nit_ci: nitCi.trim() || null,
          created_by: user.id
        }
      ])

      if (error) throw error

      alertSuccess('Cliente registrado', `${codigoFinal} — ${nombre.trim()}`)
      onSuccess()
      onClose()
    } catch (err) {
      console.error(err)
      alertError('No se pudo guardar', 'Verifica los datos e intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div
        style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000
        }}
        onClick={!loading ? onClose : undefined}
      />

      <div 
        style={{
          position: 'fixed', zIndex: 1001,
          width: '440px', maxWidth: '90vw',
          backgroundColor: 'white', borderRadius: '14px',
          border: '0.5px solid #E5E7EB',
          top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column'
        }}
        onKeyDown={handleKeyDown}
      >
        <div style={{
          padding: '18px 22px 14px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', borderBottom: '0.5px solid #F1EFE8'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserPlus size={18} color="#0F6E56" />
            <h2 style={{ fontSize: '17px', fontWeight: 500, color: '#2C2C2A', margin: 0 }}>
              Nuevo cliente
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}
          >
            <X size={18} color="#888780" />
          </button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 500, color: '#888780', letterSpacing: '0.05em', marginBottom: '5px' }}>
              <User size={11} /> NOMBRE O EMPRESA *
            </label>
            <input
              ref={inputRef}
              disabled={loading}
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              placeholder="Ej: Carlos Mendoza"
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', 
                fontSize: '14px', color: '#2C2C2A', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#0F6E56'
                e.target.style.boxShadow = '0 0 0 3px rgba(15,110,86,0.08)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
                e.target.style.boxShadow = 'none'
              }}
              autoComplete="off"
            />
            
            {sugerencias.length > 0 && nombre.trim().length > 3 && (
              <div style={{
                marginTop: '8px', background: '#FAEEDA', borderRadius: '8px',
                padding: '10px 12px', borderLeft: '3px solid #854F0B'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <AlertTriangle size={12} color="#854F0B" />
                  <span style={{ fontSize: '11px', fontWeight: 500, color: '#633806' }}>
                    Cliente similar encontrado
                  </span>
                </div>
                
                {sugerencias.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%', background: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 500, color: '#854F0B'
                    }}>
                      {getInicialesAvatar(s.nombre || s.empresa || 'C')}
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#2C2C2A' }}>{s.nombre}</span>
                      <span style={{ fontSize: '11px', color: '#888780' }}>{s.telefono || 'Sin teléfono'}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose()
                        navigate(`/clientes/${s.id}`)
                      }}
                      style={{ background: 'transparent', border: 'none', color: '#185FA5', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                      onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                      Ver →
                    </button>
                  </div>
                ))}
                
                <p style={{ margin: '6px 0 0 0', fontSize: '11px', color: '#854F0B' }}>
                  ¿Es el mismo? Si no, continúa normalmente.
                </p>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 500, color: '#888780', letterSpacing: '0.05em', marginBottom: '5px' }}>
              <Phone size={11} /> TELÉFONO
            </label>
            <input
              type="tel"
              disabled={loading}
              value={telefono}
              onChange={e => setTelefono(e.target.value)}
              placeholder="Ej: 77712345"
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', 
                fontSize: '14px', color: '#2C2C2A', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#0F6E56'
                e.target.style.boxShadow = '0 0 0 3px rgba(15,110,86,0.08)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', textTransform: 'uppercase', fontWeight: 500, color: '#888780', letterSpacing: '0.05em', marginBottom: '5px' }}>
              <CreditCard size={11} /> NIT / CI
            </label>
            <input
              disabled={loading}
              value={nitCi}
              onChange={e => setNitCi(e.target.value)}
              placeholder="Opcional"
              style={{
                width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: '8px', 
                fontSize: '14px', color: '#2C2C2A', outline: 'none', transition: 'border-color 0.15s, box-shadow 0.15s',
                boxSizing: 'border-box'
              }}
              onFocus={e => {
                e.target.style.borderColor = '#0F6E56'
                e.target.style.boxShadow = '0 0 0 3px rgba(15,110,86,0.08)'
              }}
              onBlur={e => {
                e.target.style.borderColor = '#E5E7EB'
                e.target.style.boxShadow = 'none'
              }}
            />
          </div>

        </div>

        <div style={{
          padding: '12px 22px 18px', borderTop: '0.5px solid #F1EFE8',
          display: 'flex', justifyContent: 'flex-end', gap: '8px'
        }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              background: 'transparent', border: 'none', color: '#888780',
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
              fontWeight: 500, transition: 'background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F9F9F7'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            Cancelar
          </button>
          
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !nombre.trim()}
            style={{
              background: '#0F6E56', border: 'none', color: 'white',
              padding: '8px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              cursor: (loading || !nombre.trim()) ? 'not-allowed' : 'pointer',
              opacity: (loading || !nombre.trim()) ? 0.6 : 1,
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={e => { if(!loading && nombre.trim()) e.currentTarget.style.background = '#085041' }}
            onMouseLeave={e => { if(!loading && nombre.trim()) e.currentTarget.style.background = '#0F6E56' }}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {loading ? 'Guardando...' : 'Guardar cliente'}
          </button>
        </div>
      </div>
    </>
  )
}
