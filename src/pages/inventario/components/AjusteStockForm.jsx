import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/ProtectedRoute'
import { alertSuccess, alertError, alertWarning } from '../../../lib/alerts'
import { X, Save, Loader2, ArrowRight } from 'lucide-react'

export default function AjusteStockForm({ isOpen, onClose, onSuccess, productoId: initialProductoId }) {
  const { user } = useAuth()
  
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  
  // Data for selects
  const [productos, setProductos] = useState([])
  const [almacenes, setAlmacenes] = useState([])
  const [ubicaciones, setUbicaciones] = useState([])
  
  // Form State
  const [productoId, setProductoId] = useState(initialProductoId || '')
  const [almacenId, setAlmacenId] = useState('')
  const [ubicacionId, setUbicacionId] = useState('')
  const [nuevoStock, setNuevoStock] = useState('')
  const [notas, setNotas] = useState('')

  // Selected Product Info
  const [productoInfo, setProductoInfo] = useState(null)
  const [stockActual, setStockActual] = useState(0)

  useEffect(() => {
    if (isOpen) {
      setProductoId(initialProductoId || '')
      setAlmacenId('')
      setUbicacionId('')
      setNuevoStock('')
      setNotas('')
      setStockActual(0)
      setProductoInfo(null)
      fetchInitialData()
    }
  }, [isOpen, initialProductoId])

  useEffect(() => {
    if (almacenId) {
      fetchUbicaciones(almacenId)
    } else {
      setUbicaciones([])
      setUbicacionId('')
    }
    fetchStock()
  }, [almacenId, productoId])

  async function fetchInitialData() {
    setFetchingData(true)
    try {
      const { data: alm } = await supabase.from('almacenes').select('*').eq('activo', true).order('codigo')
      if (alm) {
        setAlmacenes(alm)
        if (alm.length > 0) setAlmacenId(alm[0].id)
      }

      if (!initialProductoId) {
        const { data: prods } = await supabase.from('productos').select('id, nombre, codigo').eq('activo', true).order('nombre')
        if (prods) setProductos(prods)
      } else {
        const { data: prodInfo } = await supabase.from('productos').select('nombre, codigo').eq('id', initialProductoId).single()
        if (prodInfo) setProductoInfo(prodInfo)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setFetchingData(false)
    }
  }

  async function fetchUbicaciones(almId) {
    const { data } = await supabase.from('ubicaciones').select('*').eq('almacen_id', almId).eq('activo', true).order('codigo')
    setUbicaciones(data || [])
    if (data && data.length > 0) setUbicacionId(data[0].id)
    else setUbicacionId('')
  }

  async function fetchStock() {
    if (!productoId || !almacenId) {
      setStockActual(0)
      return
    }
    const { data } = await supabase
      .from('inventario_stock')
      .select('stock_actual')
      .eq('producto_id', productoId)
      .eq('almacen_id', almacenId)
      .single()
    
    setStockActual(data?.stock_actual || 0)
    
    if (!productoInfo && productoId) {
       const { data: pInfo } = await supabase.from('productos').select('nombre, codigo').eq('id', productoId).single()
       if (pInfo) setProductoInfo(pInfo)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!productoId) return alertError('Validación', 'Selecciona un producto')
    if (!almacenId) return alertError('Validación', 'Selecciona un almacén')
    if (!notas) return alertError('Validación', 'Las notas son obligatorias para un ajuste manual')
    
    const qty = parseFloat(nuevoStock)
    if (isNaN(qty) || qty < 0) return alertError('Validación', 'El nuevo stock no puede ser negativo')

    setLoading(true)
    try {
      const { error } = await supabase.rpc('fn_registrar_movimiento_inventario', {
        p_producto_id: productoId,
        p_almacen_id: almacenId,
        p_ubicacion_id: ubicacionId || null,
        p_tipo: 'AJUSTE',
        p_origen: 'AJUSTE_MANUAL',
        p_cantidad: qty,
        p_costo_unitario: null,
        p_ref_tabla: null,
        p_ref_id: null,
        p_notas: notas,
        p_usuario_id: user.id
      })

      if (error) throw error

      alertSuccess('Stock ajustado', 'El inventario fue actualizado correctamente')
      onSuccess()
      onClose()
    } catch (error) {
      console.error(error)
      alertError('Error al ajustar el stock', error.message || 'Intenta nuevamente')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const parsedNuevoStock = parseFloat(nuevoStock)
  const isInputValid = !isNaN(parsedNuevoStock)
  const diferencia = isInputValid ? parsedNuevoStock - stockActual : 0

  let diffColor = '#2C2C2A'
  if (diferencia > 0) diffColor = '#3B6D11'
  if (diferencia < 0) diffColor = '#A32D2D'

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
      
      <div style={{ position: 'relative', width: '100%', maxWidth: '500px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
        
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#2C2C2A', margin: 0 }}>
            Ajuste de Stock
          </h2>
          <button onClick={onClose} style={{ color: '#888780', padding: '4px' }}><X size={20} /></button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {fetchingData ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><Loader2 className="animate-spin" color="#888780" /></div>
          ) : (
            <form id="ajuste-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {!initialProductoId ? (
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#2C2C2A', marginBottom: '6px' }}>Producto *</label>
                  <select
                    value={productoId}
                    onChange={(e) => setProductoId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Selecciona un producto...</option>
                    {productos.map(p => <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ backgroundColor: '#F9F9F7', padding: '12px 16px', borderRadius: '8px', border: '1px solid #E5E7EB' }}>
                  <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#2C2C2A' }}>{productoInfo?.nombre}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: '#888780' }}>{productoInfo?.codigo}</p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#2C2C2A', marginBottom: '6px' }}>Almacén *</label>
                  <select
                    value={almacenId}
                    onChange={(e) => setAlmacenId(e.target.value)}
                    required
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">Seleccione...</option>
                    {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#2C2C2A', marginBottom: '6px' }}>Ubicación</label>
                  <select
                    value={ubicacionId}
                    onChange={(e) => setUbicacionId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none' }}
                  >
                    <option value="">(Opcional)</option>
                    {ubicaciones.map(u => <option key={u.id} value={u.id}>{u.codigo}</option>)}
                  </select>
                </div>
              </div>

              {/* Preview Diferencia */}
              {productoId && almacenId && (
                <div style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
                  backgroundColor: '#F9F9F7', 
                  border: `1px solid #E5E7EB`,
                  padding: '16px', borderRadius: '8px', marginTop: '4px'
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: '#888780', textTransform: 'uppercase' }}>Stock actual</p>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#2C2C2A' }}>{stockActual}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '11px', color: '#888780', textTransform: 'uppercase' }}>Diferencia</p>
                    <p style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: diffColor }}>
                      {diferencia > 0 ? '+' : ''}{isInputValid ? diferencia : 0}
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#2C2C2A', marginBottom: '6px' }}>Nuevo Stock Final *</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={nuevoStock}
                  onChange={(e) => setNuevoStock(e.target.value)}
                  placeholder="Ej: 150"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#2C2C2A', marginBottom: '6px' }}>Notas / Motivo *</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  required
                  rows="3"
                  placeholder="Motivo del ajuste manual..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E5E7EB', fontSize: '14px', outline: 'none', resize: 'vertical' }}
                />
              </div>

            </form>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #E5E7EB', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: '#2C2C2A', backgroundColor: 'white', border: '1px solid #E5E7EB' }}
          >
            Cancelar
          </button>
          <button
            form="ajuste-form"
            type="submit"
            disabled={loading || fetchingData}
            style={{ 
              padding: '8px 16px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, color: 'white', border: 'none',
              backgroundColor: '#185FA5', display: 'flex', alignItems: 'center', gap: '8px',
              opacity: (loading || fetchingData) ? 0.7 : 1
            }}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Aplicar Ajuste
          </button>
        </div>

      </div>
    </div>
  )
}
