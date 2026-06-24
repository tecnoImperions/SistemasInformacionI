import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { X, Loader2, ArrowRight } from 'lucide-react'

export default function HistorialMovimientos({ isOpen, onClose, productoId, productoNombre }) {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && productoId) {
      fetchMovimientos()
    } else {
      setMovimientos([])
    }
  }, [isOpen, productoId])

  async function fetchMovimientos() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventario_movimientos')
        .select(`
          *,
          perfiles:usuario_id (nombre)
        `)
        .eq('producto_id', productoId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setMovimientos(data || [])
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      
      <div style={{ 
        position: 'relative', width: '100%', maxWidth: '480px', backgroundColor: 'white', 
        display: 'flex', flexDirection: 'column', height: '100vh',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
        animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F9F9F7' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2C2C2A', margin: 0 }}>Historial de movimientos</h2>
            <p style={{ fontSize: '13px', color: '#888780', margin: '4px 0 0 0', fontWeight: 500 }}>{productoNombre}</p>
          </div>
          <button onClick={onClose} style={{ color: '#888780', padding: '4px' }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Loader2 className="animate-spin" color="#888780" /></div>
          ) : movimientos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#888780', padding: '40px 0', fontSize: '14px' }}>
              No hay movimientos registrados para este producto.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {movimientos.map(mov => {
                const isEntrada = mov.tipo === 'ENTRADA'
                const isSalida = mov.tipo === 'SALIDA'
                const isAjuste = mov.tipo === 'AJUSTE'
                
                let badgeBg, badgeColor, badgeText
                if (isEntrada) { badgeBg = '#EAF3DE'; badgeColor = '#3B6D11'; badgeText = '↑ Entrada' }
                else if (isSalida) { badgeBg = '#FCEBEB'; badgeColor = '#A32D2D'; badgeText = '↓ Salida' }
                else { badgeBg = '#E6F1FB'; badgeColor = '#185FA5'; badgeText = '⚙ Ajuste' }

                let qtyColor = '#2C2C2A'
                if (isEntrada) qtyColor = '#3B6D11'
                if (isSalida) qtyColor = '#A32D2D'

                const dateObj = new Date(mov.created_at)
                const dateStr = dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const timeStr = dateObj.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

                return (
                  <div key={mov.id} style={{ padding: '16px', border: '1px solid #E5E7EB', borderRadius: '8px', backgroundColor: 'white' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <span style={{ backgroundColor: badgeBg, color: badgeColor, padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>
                          {badgeText}
                        </span>
                        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: '#888780' }}>
                          {dateStr} {timeStr}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: qtyColor }}>
                          {isEntrada ? '+' : isSalida ? '-' : ''}{mov.cantidad}
                        </p>
                        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: '#888780', textTransform: 'uppercase' }}>
                          {mov.origen.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', backgroundColor: '#F9F9F7', borderRadius: '6px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#888780' }}>Stock:</span>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: '#2C2C2A' }}>{mov.stock_anterior}</span>
                      <ArrowRight size={14} color="#888780" />
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#2C2C2A' }}>{mov.stock_nuevo}</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#2C2C2A' }}>
                        <span style={{ color: '#888780' }}>Usuario:</span> {mov.perfiles?.nombre || 'Sistema'}
                      </p>
                      {mov.notas && (
                        <p style={{ margin: 0, fontSize: '12px', color: '#2C2C2A' }}>
                          <span style={{ color: '#888780' }}>Notas:</span> {mov.notas}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
              
              {movimientos.length === 50 && (
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#888780', margin: '16px 0 0 0' }}>
                  Mostrando los últimos 50 movimientos
                </p>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
