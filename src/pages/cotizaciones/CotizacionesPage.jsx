import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { alertError, alertConfirm } from '../../lib/alerts'
import { Loader2, Plus, Edit2, Copy, Eye } from 'lucide-react'

export default function CotizacionesPage() {
  const navigate = useNavigate()
  const [cotizaciones, setCotizaciones] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Filtro
  const [estadoFilter, setEstadoFilter] = useState('TODOS')

  useEffect(() => {
    fetchCotizaciones()
  }, [estadoFilter])

  async function fetchCotizaciones() {
    setLoading(true)
    try {
      let query = supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes (nombre, empresa, telefono)
        `)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (estadoFilter !== 'TODOS') {
        // En frontend haremos el check de VENCIDA (estado ENVIADA y fecha < hoy)
        // Pero si el filtro es explícito para BD, lo aplicamos
        if (estadoFilter !== 'VENCIDA') {
          query = query.eq('estado', estadoFilter)
        } else {
          query = query.eq('estado', 'ENVIADA').lt('fecha_validez', new Date().toISOString().split('T')[0])
        }
      }

      const { data, error } = await query
      if (error) throw error
      setCotizaciones(data || [])
    } catch (error) {
      console.error(error)
      alertError('Error al cargar cotizaciones', 'No se pudieron cargar los datos.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDuplicar(cot) {
    const res = await alertConfirm(
      '¿Duplicar cotización?',
      'Se creará una copia en estado BORRADOR con la fecha de hoy.',
      'Sí, duplicar'
    )
    if (!res.isConfirmed) return

    try {
      // Obtener detalle actual
      const { data: detalle, error: detErr } = await supabase
        .from('cotizaciones_detalle')
        .select('*')
        .eq('cotizacion_id', cot.id)

      if (detErr) throw detErr

      // Generar nuevo numero
      const { count } = await supabase.from('cotizaciones').select('*', { count: 'exact', head: true })
      const year = new Date().getFullYear()
      const nextNum = (count || 0) + 1
      const nuevoNumero = `COT-${year}-${String(nextNum).padStart(5, '0')}`

      const hoy = new Date().toISOString().split('T')[0]
      const fValidez = new Date()
      fValidez.setDate(fValidez.getDate() + 15)

      // Insertar Cabecera
      const { data: nuevaCot, error: insErr } = await supabase.from('cotizaciones').insert([{
        numero: nuevoNumero,
        cliente_id: cot.cliente_id,
        fecha_emision: hoy,
        fecha_validez: fValidez.toISOString().split('T')[0],
        moneda: cot.moneda,
        estado: 'BORRADOR',
        subtotal: cot.subtotal,
        descuento_global: cot.descuento_global,
        total: cot.total,
        condiciones: cot.condiciones,
        observaciones: cot.observaciones,
        created_by: cot.created_by // O el user actual
      }]).select('id').single()

      if (insErr) throw insErr

      // Insertar Detalle
      if (detalle && detalle.length > 0) {
        const payloadDet = detalle.map(d => ({
          cotizacion_id: nuevaCot.id,
          producto_id: d.producto_id,
          descripcion: d.descripcion,
          cantidad: d.cantidad,
          precio_unitario: d.precio_unitario,
          descuento_pct: d.descuento_pct,
          subtotal: d.subtotal
        }))
        await supabase.from('cotizaciones_detalle').insert(payloadDet)
      }

      fetchCotizaciones()
      navigate(`/cotizaciones/${nuevaCot.id}/editar`)

    } catch (error) {
      console.error(error)
      alertError('Error al duplicar', 'No se pudo duplicar la cotización.')
    }
  }

  const badgeStyles = {
    BORRADOR: { bg: '#F1EFE8', text: '#888780' },
    ENVIADA: { bg: '#E6F1FB', text: '#185FA5' },
    APROBADA: { bg: '#EAF3DE', text: '#3B6D11' },
    RECHAZADA: { bg: '#FCEBEB', text: '#A32D2D' },
    VENCIDA: { bg: '#FAEEDA', text: '#854F0B' },
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-medium text-[#2C2C2A]">Cotizaciones</h1>
          <p className="text-sm text-[#888780] mt-0.5">Propuestas comerciales para clientes</p>
        </div>
        <Link
          to="/cotizaciones/nueva"
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: '#0F6E56' }}
        >
          <Plus size={18} />
          Nueva Cotización
        </Link>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {['TODOS', 'BORRADOR', 'ENVIADA', 'APROBADA', 'RECHAZADA', 'VENCIDA'].map(estado => (
          <button
            key={estado}
            onClick={() => setEstadoFilter(estado)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              estadoFilter === estado
                ? 'bg-[#2C2C2A] text-white'
                : 'bg-white border border-[#E5E7EB] text-[#888780] hover:bg-[#F9F9F7]'
            }`}
          >
            {estado === 'TODOS' ? 'Todas' : estado}
          </button>
        ))}
      </div>

      {/* Tabla */}
      <div className="rounded-xl overflow-hidden bg-white border border-[#E5E7EB] shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9F9F7] border-b border-[#E5E7EB]">
                <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Número</th>
                <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Cliente</th>
                <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Fechas</th>
                <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Total</th>
                <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-[#888780] mx-auto mb-2" />
                    <p className="text-sm text-[#888780]">Cargando cotizaciones...</p>
                  </td>
                </tr>
              ) : cotizaciones.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <p className="text-sm text-[#888780]">No se encontraron cotizaciones.</p>
                  </td>
                </tr>
              ) : (
                cotizaciones.map(cot => {
                  const hoy = new Date().toISOString().split('T')[0]
                  const isVencida = cot.estado === 'ENVIADA' && cot.fecha_validez < hoy
                  const estadoReal = isVencida ? 'VENCIDA' : cot.estado

                  // Si el filtro era VENCIDA, pero el backend nos mandó todo (si hubo error en la query), filtramos frontend
                  if (estadoFilter === 'VENCIDA' && !isVencida) return null
                  if (estadoFilter === 'ENVIADA' && isVencida) return null

                  const badge = badgeStyles[estadoReal] || badgeStyles.BORRADOR
                  const fechaEmision = new Date(cot.fecha_emision).toLocaleDateString('es-ES')
                  const fechaValidez = new Date(cot.fecha_validez).toLocaleDateString('es-ES')

                  return (
                    <tr key={cot.id} className="hover:bg-[#F9F9F7] transition-colors group">
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-[#F1EFE8] text-[#888780] text-xs font-medium">
                          {cot.numero}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#2C2C2A]">{cot.clientes?.nombre}</p>
                        <p className="text-xs text-[#888780]">{cot.clientes?.empresa}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-[#2C2C2A]">{fechaEmision}</p>
                        <p className={`text-xs ${isVencida ? 'text-[#A32D2D] font-medium' : 'text-[#888780]'}`}>
                          Válida: {fechaValidez}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-[#2C2C2A]">
                          {Number(cot.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {cot.moneda}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide"
                          style={{ backgroundColor: badge.bg, color: badge.text }}
                        >
                          {estadoReal}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link
                            to={`/cotizaciones/${cot.id}`}
                            className="p-1.5 text-[#185FA5] hover:bg-[#E6F1FB] rounded-md transition-colors"
                            title="Ver detalle"
                          >
                            <Eye size={16} />
                          </Link>
                          {cot.estado === 'BORRADOR' && (
                            <Link
                              to={`/cotizaciones/${cot.id}/editar`}
                              className="p-1.5 text-[#888780] hover:bg-[#E5E7EB] hover:text-[#2C2C2A] rounded-md transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} />
                            </Link>
                          )}
                          <button
                            onClick={() => handleDuplicar(cot)}
                            className="p-1.5 text-[#888780] hover:bg-[#E5E7EB] hover:text-[#2C2C2A] rounded-md transition-colors"
                            title="Duplicar"
                          >
                            <Copy size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
