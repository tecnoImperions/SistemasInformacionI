import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { alertSuccess, alertError, alertConfirm, alertConfirmDanger } from '../../../lib/alerts'
import { ArrowLeft, Edit2, CheckCircle, Ban, Send, Loader2, FileText } from 'lucide-react'

export default function CotizacionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cotizacion, setCotizacion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCotizacion()
  }, [id])

  async function fetchCotizacion() {
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes (nombre, empresa, nit_ci, telefono, email),
          cotizaciones_detalle (
            id,
            descripcion,
            cantidad,
            precio_unitario,
            descuento_pct,
            subtotal,
            productos (codigo, marca, nombre)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setCotizacion(data)
    } catch (error) {
      console.error(error)
      alertError('Error', 'No se pudo cargar la cotización.')
    } finally {
      setLoading(false)
    }
  }

  async function updateEstado(nuevoEstado) {
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (error) throw error
      alertSuccess('Estado actualizado', `La cotización ahora está en estado ${nuevoEstado}.`)
      fetchCotizacion()
    } catch (error) {
      alertError('Error', 'No se pudo actualizar el estado.')
    }
  }

  const handleMarcarEnviada = async () => {
    const res = await alertConfirm('¿Marcar como Enviada?', 'La cotización pasará a estado ENVIADA.', 'Sí, marcar enviada')
    if (res.isConfirmed) updateEstado('ENVIADA')
  }

  const handleAprobar = async () => {
    const res = await alertConfirm(
      '¿Marcar como Aprobada?', 
      'El cliente aceptó esta cotización.', 
      'Sí, aprobar'
    )
    if (res.isConfirmed) updateEstado('APROBADA')
  }

  const handleRechazar = async () => {
    const res = await alertConfirmDanger(
      '¿Marcar como Rechazada?',
      'La cotización quedará cerrada.',
      'Sí, rechazar'
    )
    if (res.isConfirmed) updateEstado('RECHAZADA')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#888780]" />
      </div>
    )
  }

  if (!cotizacion) return null

  const hoy = new Date().toISOString().split('T')[0]
  const isVencida = cotizacion.estado === 'ENVIADA' && cotizacion.fecha_validez < hoy
  const estadoReal = isVencida ? 'VENCIDA' : cotizacion.estado

  const badgeStyles = {
    BORRADOR: { bg: '#F1EFE8', text: '#888780' },
    ENVIADA: { bg: '#E6F1FB', text: '#185FA5' },
    APROBADA: { bg: '#EAF3DE', text: '#3B6D11' },
    RECHAZADA: { bg: '#FCEBEB', text: '#A32D2D' },
    VENCIDA: { bg: '#FAEEDA', text: '#854F0B' },
  }
  const badge = badgeStyles[estadoReal] || badgeStyles.BORRADOR

  return (
    <div className="max-w-4xl mx-auto pb-24">
      
      {/* Barra de título y acciones */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/cotizaciones')}
            className="p-2 rounded-lg hover:bg-[#E5E7EB] text-[#888780] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-medium text-[#2C2C2A]">{cotizacion.numero}</h1>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {estadoReal}
              </span>
            </div>
            <p className="text-sm text-[#888780] mt-1">Detalle de la cotización</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/cotizaciones/${id}/preview`}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#E5E7EB] bg-white text-[#2C2C2A] hover:bg-[#F9F9F7] transition-colors"
          >
            <FileText size={16} />
            Ver Documento
          </Link>
          
          {cotizacion.estado === 'BORRADOR' && (
            <Link
              to={`/cotizaciones/${id}/editar`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#E5E7EB] bg-white text-[#2C2C2A] hover:bg-[#F9F9F7] transition-colors"
            >
              <Edit2 size={16} />
              Editar
            </Link>
          )}

          {cotizacion.estado === 'BORRADOR' && (
            <button
              onClick={handleMarcarEnviada}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#185FA5] text-white hover:bg-[#134B82] transition-colors"
            >
              <Send size={16} />
              Enviar
            </button>
          )}

          {cotizacion.estado === 'ENVIADA' && (
            <>
              <button
                onClick={handleAprobar}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0F6E56] text-white hover:bg-[#085041] transition-colors shadow-sm"
              >
                <CheckCircle size={16} />
                Aprobar
              </button>
              <button
                onClick={handleRechazar}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#FCEBEB] bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#F8D7D7] transition-colors"
              >
                <Ban size={16} />
                Rechazar
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card Info General */}
        <div className="md:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#888780] uppercase tracking-wider mb-4">Información del Cliente</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#888780] mb-1">Cliente</p>
              <p className="font-medium text-[#2C2C2A]">{cotizacion.clientes?.nombre}</p>
              <p className="text-xs text-[#888780]">{cotizacion.clientes?.empresa}</p>
            </div>
            <div>
              <p className="text-sm text-[#888780] mb-1">Contacto</p>
              <p className="text-sm text-[#2C2C2A]">{cotizacion.clientes?.email || 'Sin email'}</p>
              <p className="text-sm text-[#2C2C2A]">{cotizacion.clientes?.telefono || 'Sin teléfono'}</p>
            </div>
            <div className="col-span-2 pt-4 border-t border-[#E5E7EB] mt-2">
              <p className="text-sm text-[#888780] mb-1">Condiciones Comerciales</p>
              <p className="text-sm text-[#2C2C2A] whitespace-pre-line">{cotizacion.condiciones || '—'}</p>
            </div>
          </div>
        </div>

        {/* Card Fechas y Total */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-[#888780] mb-0.5">Emisión</p>
                <p className="font-medium text-[#2C2C2A]">{new Date(cotizacion.fecha_emision).toLocaleDateString('es-ES')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#888780] mb-0.5">Validez</p>
                <p className={`font-medium ${isVencida ? 'text-[#A32D2D]' : 'text-[#2C2C2A]'}`}>
                  {new Date(cotizacion.fecha_validez).toLocaleDateString('es-ES')}
                </p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-[#E5E7EB]">
            <p className="text-sm text-[#888780] mb-1">Total Cotización</p>
            <p className="text-3xl font-bold text-[#0F6E56]">
              {Number(cotizacion.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {cotizacion.moneda}
            </p>
          </div>
        </div>
      </div>

      {/* Card Productos */}
      <div className="bg-white rounded-xl border border-[#E5E7EB] shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-base font-semibold text-[#2C2C2A]">Detalle de Productos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F9F9F7] border-b border-[#E5E7EB]">
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Descripción</th>
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Cantidad</th>
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Precio Unit.</th>
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Desc. %</th>
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {cotizacion.cotizaciones_detalle?.map(d => (
                <tr key={d.id} className="hover:bg-[#F9F9F7] transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[#2C2C2A]">{d.descripcion}</p>
                    {d.productos && (
                      <p className="text-xs text-[#888780]">Ref: {d.productos?.codigo} {d.productos?.marca ? `• ${d.productos.marca}` : ''}</p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-medium text-[#2C2C2A]">{d.cantidad}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-[#2C2C2A]">
                      {Number(d.precio_unitario).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-[#2C2C2A]">{d.descuento_pct}%</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-[#2C2C2A]">
                      {Number(d.subtotal).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F9F9F7]">
                <td colSpan={4} className="px-6 py-4 text-right font-medium text-[#2C2C2A]">Subtotal Neto:</td>
                <td className="px-6 py-4 text-right font-bold text-[#2C2C2A]">
                  {Number(cotizacion.subtotal).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {cotizacion.moneda}
                </td>
              </tr>
              {cotizacion.descuento_global > 0 && (
                <tr className="bg-[#F9F9F7]">
                  <td colSpan={4} className="px-6 py-2 text-right font-medium text-[#A32D2D]">Descuento Global ({cotizacion.descuento_global}%):</td>
                  <td className="px-6 py-2 text-right font-bold text-[#A32D2D]">
                    -{Number(cotizacion.subtotal - cotizacion.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {cotizacion.moneda}
                  </td>
                </tr>
              )}
              <tr className="bg-[#EAF3DE]">
                <td colSpan={4} className="px-6 py-4 text-right font-bold text-[#2C2C2A] text-lg">TOTAL:</td>
                <td className="px-6 py-4 text-right font-bold text-[#0F6E56] text-xl">
                  {Number(cotizacion.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {cotizacion.moneda}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
