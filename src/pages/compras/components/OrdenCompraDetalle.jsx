import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { alertSuccess, alertError, alertConfirm, alertConfirmDanger } from '../../../lib/alerts'
import { ArrowLeft, Edit2, Send, CheckCircle, Ban, Loader2, Printer } from 'lucide-react'

export default function OrdenCompraDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [orden, setOrden] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrden()
  }, [id])

  async function fetchOrden() {
    try {
      const { data, error } = await supabase
        .from('ordenes_compra')
        .select(`
          *,
          proveedores (empresa, pais, email, whatsapp, canal_preferido),
          ordenes_compra_detalle (
            id,
            cantidad,
            costo_unitario,
            subtotal,
            productos (codigo, nombre, marca)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setOrden(data)
    } catch (error) {
      console.error(error)
      alertError('Error', 'No se pudo cargar la orden de compra.')
    } finally {
      setLoading(false)
    }
  }

  async function updateEstado(nuevoEstado) {
    try {
      const { error } = await supabase
        .from('ordenes_compra')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (error) throw error
      alertSuccess('Estado actualizado', `La orden ahora está en estado ${nuevoEstado}.`)
      fetchOrden()
    } catch (error) {
      alertError('Error', 'No se pudo actualizar el estado.')
    }
  }

  const handleMarcarEnviada = async () => {
    const res = await alertConfirm('¿Marcar como Enviada?', 'La orden pasará a estado ENVIADA.', 'Sí, marcar enviada')
    if (res.isConfirmed) updateEstado('ENVIADA')
  }

  const handleMarcarRecibida = async () => {
    const res = await alertConfirm(
      '¿Confirmar recepción?', 
      'El inventario se actualizará automáticamente.', 
      'Confirmar recepción'
    )
    if (res.isConfirmed) updateEstado('RECIBIDA')
  }

  const handleCancelar = async () => {
    const res = await alertConfirmDanger(
      '¿Cancelar esta orden?',
      'Esta acción no se puede deshacer.',
      'Sí, cancelar orden'
    )
    if (res.isConfirmed) updateEstado('CANCELADA')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#888780]" />
      </div>
    )
  }

  if (!orden) return null

  const badgeStyles = {
    BORRADOR: { bg: '#F1EFE8', text: '#888780' },
    ENVIADA: { bg: '#E6F1FB', text: '#185FA5' },
    RECIBIDA: { bg: '#EAF3DE', text: '#3B6D11' },
    CANCELADA: { bg: '#FCEBEB', text: '#A32D2D' },
  }
  const badge = badgeStyles[orden.estado] || badgeStyles.BORRADOR

  return (
    <div className="max-w-4xl mx-auto pb-24">
      
      {/* Barra de título y acciones */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/compras')}
            className="p-2 rounded-lg hover:bg-[#E5E7EB] text-[#888780] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-medium text-[#2C2C2A]">{orden.numero}</h1>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {orden.estado}
              </span>
            </div>
            <p className="text-sm text-[#888780] mt-1">Detalle de la orden de compra</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {orden.estado === 'BORRADOR' && (
            <Link
              to={`/compras/${id}/editar`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#E5E7EB] bg-white text-[#2C2C2A] hover:bg-[#F9F9F7] transition-colors"
            >
              <Edit2 size={16} />
              Editar
            </Link>
          )}
          {orden.estado !== 'CANCELADA' && orden.estado !== 'RECIBIDA' && (
            <button
              onClick={handleCancelar}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#FCEBEB] bg-[#FCEBEB] text-[#A32D2D] hover:bg-[#F8D7D7] transition-colors"
            >
              <Ban size={16} />
              Cancelar
            </button>
          )}
          {orden.estado === 'BORRADOR' && (
            <button
              onClick={handleMarcarEnviada}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#185FA5] text-white hover:bg-[#134B82] transition-colors"
            >
              <Send size={16} />
              Marcar como Enviada
            </button>
          )}
          {orden.estado === 'ENVIADA' && (
            <button
              onClick={handleMarcarRecibida}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0F6E56] text-white hover:bg-[#085041] transition-colors shadow-sm"
            >
              <CheckCircle size={16} />
              Marcar como Recibida
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card Info General */}
        <div className="md:col-span-2 bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-[#888780] uppercase tracking-wider mb-4">Información del Proveedor</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-[#888780] mb-1">Empresa</p>
              <p className="font-medium text-[#2C2C2A]">{orden.proveedores?.empresa}</p>
              <p className="text-xs text-[#888780]">{orden.proveedores?.pais}</p>
            </div>
            <div>
              <p className="text-sm text-[#888780] mb-1">Contacto</p>
              <p className="text-sm text-[#2C2C2A]">{orden.proveedores?.email || 'Sin email'}</p>
              <p className="text-sm text-[#2C2C2A]">{orden.proveedores?.whatsapp || 'Sin teléfono'}</p>
            </div>
            <div className="col-span-2 pt-4 border-t border-[#E5E7EB] mt-2">
              <p className="text-sm text-[#888780] mb-1">Observaciones</p>
              <p className="text-sm text-[#2C2C2A] whitespace-pre-line">{orden.observaciones || '—'}</p>
            </div>
          </div>
        </div>

        {/* Card Fechas y Total */}
        <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="mb-4 flex justify-between items-center">
              <div>
                <p className="text-sm text-[#888780] mb-0.5">Emisión</p>
                <p className="font-medium text-[#2C2C2A]">{new Date(orden.fecha_emision).toLocaleDateString('es-ES')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-[#888780] mb-0.5">Esperada</p>
                <p className="font-medium text-[#2C2C2A]">{orden.fecha_esperada ? new Date(orden.fecha_esperada).toLocaleDateString('es-ES') : '—'}</p>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-[#E5E7EB]">
            <p className="text-sm text-[#888780] mb-1">Total de la Orden</p>
            <p className="text-3xl font-bold text-[#0F6E56]">
              {Number(orden.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {orden.moneda}
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
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider">Producto</th>
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Cantidad</th>
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Costo Unit.</th>
                <th className="px-6 py-3 text-[11px] font-medium text-[#888780] uppercase tracking-wider text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {orden.ordenes_compra_detalle?.map(d => (
                <tr key={d.id} className="hover:bg-[#F9F9F7] transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-[#2C2C2A]">{d.productos?.nombre}</p>
                    <p className="text-xs text-[#888780]">{d.productos?.codigo} {d.productos?.marca ? `• ${d.productos.marca}` : ''}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-medium text-[#2C2C2A]">{d.cantidad}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm text-[#2C2C2A]">
                      {Number(d.costo_unitario).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {orden.moneda}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-bold text-[#2C2C2A]">
                      {Number(d.subtotal).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {orden.moneda}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#F9F9F7]">
                <td colSpan={3} className="px-6 py-4 text-right font-medium text-[#2C2C2A]">TOTAL:</td>
                <td className="px-6 py-4 text-right font-bold text-[#0F6E56] text-lg">
                  {Number(orden.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {orden.moneda}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
