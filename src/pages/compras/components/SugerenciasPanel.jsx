import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { alertError } from '../../../lib/alerts'
import { Loader2, ShoppingCart, MessageCircle, Mail } from 'lucide-react'

export default function SugerenciasPanel() {
  const navigate = useNavigate()
  const [sugerencias, setSugerencias] = useState([])
  const [loading, setLoading] = useState(true)
  const [seleccionados, setSeleccionados] = useState([])

  useEffect(() => {
    fetchSugerencias()
  }, [])

  async function fetchSugerencias() {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('fn_sugerencias_compra', { p_almacen_id: null })
      if (error) throw error
      setSugerencias(data || [])
    } catch (error) {
      console.error(error)
      alertError('Error al cargar', 'No se pudieron cargar las sugerencias de compra.')
    } finally {
      setLoading(false)
    }
  }

  const toggleSeleccion = (productoId) => {
    setSeleccionados(prev => 
      prev.includes(productoId) 
        ? prev.filter(id => id !== productoId)
        : [...prev, productoId]
    )
  }

  const handleGenerarOrden = () => {
    // Pasar los IDs seleccionados por state a la página de nueva orden
    navigate('/compras/nueva', { state: { preseleccionados: seleccionados } })
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#888780] mb-4" />
        <p className="text-[#888780]">Calculando sugerencias del motor inteligente...</p>
      </div>
    )
  }

  if (sugerencias.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingCart className="w-12 h-12 text-[#D1CFC8] mb-4" />
        <p className="text-[#2C2C2A] font-medium text-lg">Todo en orden</p>
        <p className="text-[#888780]">No hay productos que requieran reposición en este momento.</p>
      </div>
    )
  }

  return (
    <div className="relative pb-24">
      <div className="mb-4">
        <p className="text-sm font-medium text-[#2C2C2A]">
          {sugerencias.length} productos necesitan reposición
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sugerencias.map(item => {
          const isSelected = seleccionados.includes(item.producto_id)
          const pct = Math.min(100, Math.max(0, (item.stock_actual / (item.stock_minimo || 1)) * 100))

          return (
            <div 
              key={item.producto_id}
              onClick={() => toggleSeleccion(item.producto_id)}
              className={`relative p-4 rounded-xl border cursor-pointer transition-all ${
                isSelected 
                  ? 'border-[#0F6E56] bg-[#F1F7F6] shadow-sm' 
                  : 'border-[#E5E7EB] bg-white hover:border-[#D1CFC8]'
              }`}
            >
              {/* Checkbox */}
              <div className="absolute top-4 right-4">
                <input 
                  type="checkbox" 
                  checked={isSelected}
                  onChange={() => {}} // handled by div click
                  className="w-4 h-4 text-[#0F6E56] rounded border-[#E5E7EB] focus:ring-[#0F6E56]"
                />
              </div>

              <div className="pr-8 mb-3">
                <p className="text-xs text-[#888780] font-medium mb-1">{item.codigo} {item.marca ? `• ${item.marca}` : ''}</p>
                <h3 className="text-sm font-semibold text-[#2C2C2A] line-clamp-2" title={item.nombre}>{item.nombre}</h3>
              </div>

              {/* Progress Bar */}
              <div className="mb-3">
                <div className="h-1.5 w-full bg-[#F1EFE8] rounded-full overflow-hidden mb-2">
                  <div 
                    className="h-full bg-[#A32D2D] rounded-full" 
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#888780]">
                  <span>Stock: <strong className="text-[#2C2C2A]">{item.stock_actual}</strong></span>
                  <span>Mín: <strong className="text-[#2C2C2A]">{item.stock_minimo}</strong></span>
                  <span className="text-[#A32D2D] font-medium">Falta: {item.cantidad_sugerida}</span>
                </div>
              </div>

              {/* Proveedor Preferido */}
              {item.proveedor_nombre ? (
                <div className="mt-3 pt-3 border-t border-black/5 flex items-center justify-between">
                  <div>
                    <p className="text-[11px] text-[#888780] uppercase tracking-wider mb-0.5">Proveedor Recomendado</p>
                    <p className="text-xs font-medium text-[#2C2C2A] flex items-center gap-1.5">
                      {item.canal_preferido === 'WHATSAPP' ? (
                        <MessageCircle size={12} className="text-[#25D366]" />
                      ) : item.canal_preferido === 'EMAIL' ? (
                        <Mail size={12} className="text-[#185FA5]" />
                      ) : null}
                      {item.proveedor_nombre}
                    </p>
                  </div>
                  {item.precio_referencia && (
                    <div className="text-right">
                      <p className="text-[11px] text-[#888780] uppercase tracking-wider mb-0.5">Ref</p>
                      <p className="text-xs font-medium text-[#0F6E56]">{item.precio_referencia}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 pt-3 border-t border-black/5">
                  <p className="text-[11px] text-[#888780] italic">Sin proveedor frecuente registrado.</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Botón flotante */}
      {seleccionados.length > 0 && (
        <div className="fixed bottom-8 right-8 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={handleGenerarOrden}
            className="flex items-center gap-2 px-6 py-3 rounded-full shadow-lg text-white font-medium hover:shadow-xl transition-all"
            style={{ backgroundColor: '#0F6E56' }}
          >
            <ShoppingCart size={18} />
            Generar Orden de Compra ({seleccionados.length})
          </button>
        </div>
      )}
    </div>
  )
}
