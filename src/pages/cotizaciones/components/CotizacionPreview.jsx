import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { alertSuccess, alertError, alertConfirm, alertConfirmDanger } from '../../../lib/alerts'
import { ArrowLeft, Edit2, Printer, CheckCircle, Send, Ban, Loader2, ChevronDown } from 'lucide-react'

export default function CotizacionPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [cotizacion, setCotizacion] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  useEffect(() => {
    fetchCotizacion()
  }, [id])

  async function fetchCotizacion() {
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select(`
          *,
          clientes (nombre, empresa, nit_ci, telefono, direccion, ciudad, email),
          cotizaciones_detalle (
            id,
            descripcion,
            cantidad,
            precio_unitario,
            descuento_pct,
            subtotal,
            productos (codigo, marca)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      setCotizacion(data)
    } catch (error) {
      console.error(error)
      alertError('Error', 'No se pudo cargar la cotización para previsualizar.')
    } finally {
      setLoading(false)
    }
  }

  async function updateEstado(nuevoEstado) {
    setShowStatusMenu(false)
    try {
      const { error } = await supabase
        .from('cotizaciones')
        .update({ estado: nuevoEstado })
        .eq('id', id)

      if (error) throw error
      alertSuccess('Estado actualizado', `La cotización fue marcada como ${nuevoEstado}.`)
      fetchCotizacion()
    } catch (error) {
      alertError('Error', 'No se pudo actualizar el estado.')
    }
  }

  const handleAprobar = async () => {
    const res = await alertConfirm('¿Marcar como aprobada?', 'El cliente aceptó esta cotización.', 'Sí, aprobar')
    if (res.isConfirmed) updateEstado('APROBADA')
  }

  const handleRechazar = async () => {
    const res = await alertConfirmDanger('¿Marcar como rechazada?', 'La cotización quedará cerrada.', 'Sí, rechazar')
    if (res.isConfirmed) updateEstado('RECHAZADA')
  }

  const handleEnviar = async () => {
    const res = await alertConfirm('¿Marcar como enviada?', 'La cotización quedará en espera de respuesta.', 'Sí, marcar enviada')
    if (res.isConfirmed) updateEstado('ENVIADA')
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#888780]" />
      </div>
    )
  }

  if (!cotizacion) return null

  const c = cotizacion
  const cli = cotizacion.clientes || {}
  const det = cotizacion.cotizaciones_detalle || []

  return (
    <div className="max-w-5xl mx-auto pb-24 relative">
      
      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #cotizacion-print, #cotizacion-print * {
            visibility: visible;
          }
          #cotizacion-print {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
            background: white !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
        }
      `}</style>

      {/* Toolbar superior (no-print) */}
      <div className="no-print flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-[#E5E7EB] shadow-sm sticky top-20 z-40">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/cotizaciones')}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-[#F1EFE8] text-[#888780] transition-colors"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">Volver</span>
          </button>
          <div className="h-6 w-px bg-[#E5E7EB]"></div>
          <div>
            <p className="text-sm font-semibold text-[#2C2C2A]">{c.numero}</p>
            <p className="text-xs text-[#888780]">Estado: {c.estado}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {c.estado === 'BORRADOR' && (
            <Link
              to={`/cotizaciones/${id}/editar`}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#E5E7EB] bg-white text-[#2C2C2A] hover:bg-[#F9F9F7] transition-colors"
            >
              <Edit2 size={16} /> Editar
            </Link>
          )}

          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-[#E5E7EB] bg-white text-[#2C2C2A] hover:bg-[#F9F9F7] transition-colors"
            >
              Cambiar estado <ChevronDown size={16} />
            </button>
            {showStatusMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-[#E5E7EB] rounded-lg shadow-lg overflow-hidden z-50">
                <button
                  onClick={handleEnviar}
                  className="w-full text-left px-4 py-2 text-sm text-[#185FA5] hover:bg-[#E6F1FB] flex items-center gap-2"
                >
                  <Send size={14} /> Marcar Enviada
                </button>
                <button
                  onClick={handleAprobar}
                  className="w-full text-left px-4 py-2 text-sm text-[#3B6D11] hover:bg-[#EAF3DE] flex items-center gap-2"
                >
                  <CheckCircle size={14} /> Marcar Aprobada
                </button>
                <button
                  onClick={handleRechazar}
                  className="w-full text-left px-4 py-2 text-sm text-[#A32D2D] hover:bg-[#FCEBEB] flex items-center gap-2"
                >
                  <Ban size={14} /> Marcar Rechazada
                </button>
              </div>
            )}
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0F6E56] text-white hover:bg-[#085041] transition-colors shadow-sm"
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Documento A4 */}
      <div 
        id="cotizacion-print"
        className="bg-white mx-auto shadow-md"
        style={{
          width: '210mm',
          minHeight: '297mm',
          padding: '20mm',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        {/* Encabezado */}
        <div className="flex justify-between items-start mb-10 border-b-2 border-[#2C2C2A] pb-6">
          <div>
            <h1 className="text-4xl font-black text-[#0F6E56] tracking-tight mb-2">IPCB IMPORT</h1>
            <p className="text-sm text-[#888780] leading-tight">
              Especialistas en importación y venta de repuestos.<br/>
              Santa Cruz de la Sierra, Bolivia
            </p>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-bold text-[#2C2C2A] mb-1">COTIZACIÓN</h2>
            <p className="text-lg font-medium text-[#2C2C2A] mb-2">{c.numero}</p>
            <div className="text-sm">
              <p className="text-[#888780]"><span className="text-[#2C2C2A] font-medium inline-block w-20 text-left">Fecha:</span> {new Date(c.fecha_emision).toLocaleDateString('es-ES')}</p>
              <p className="text-[#888780]"><span className="text-[#2C2C2A] font-medium inline-block w-20 text-left">Válida h.:</span> {new Date(c.fecha_validez).toLocaleDateString('es-ES')}</p>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <div className="mb-8 border border-[#E5E7EB] rounded-lg p-4 bg-[#F9F9F7]">
          <h3 className="text-[11px] font-bold text-[#888780] uppercase tracking-wider mb-3">Preparado para:</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <p className="font-semibold text-[#2C2C2A] text-base mb-1">{cli.nombre}</p>
              {cli.empresa && <p className="text-[#2C2C2A]">{cli.empresa}</p>}
              <p className="text-[#2C2C2A]">{cli.direccion || ''} {cli.ciudad || ''}</p>
            </div>
            <div className="text-[#2C2C2A]">
              <p><span className="text-[#888780] font-medium">NIT/CI:</span> {cli.nit_ci || '—'}</p>
              <p><span className="text-[#888780] font-medium">Teléfono:</span> {cli.telefono || '—'}</p>
              <p><span className="text-[#888780] font-medium">Email:</span> {cli.email || '—'}</p>
            </div>
          </div>
        </div>

        {/* Tabla Detalle */}
        <div className="mb-8 min-h-[300px]">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#2C2C2A]">
                <th className="py-2 text-[#2C2C2A] font-bold uppercase w-10">#</th>
                <th className="py-2 text-[#2C2C2A] font-bold uppercase">Descripción</th>
                <th className="py-2 text-[#2C2C2A] font-bold uppercase text-right w-20">Cant.</th>
                <th className="py-2 text-[#2C2C2A] font-bold uppercase text-right w-28">P. Unit.</th>
                <th className="py-2 text-[#2C2C2A] font-bold uppercase text-right w-20">% Desc</th>
                <th className="py-2 text-[#2C2C2A] font-bold uppercase text-right w-32">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {det.map((item, i) => (
                <tr key={item.id} className="border-b border-[#E5E7EB]">
                  <td className="py-3 text-[#888780] align-top">{i + 1}</td>
                  <td className="py-3 align-top pr-4">
                    <p className="font-medium text-[#2C2C2A]">{item.descripcion}</p>
                    {item.productos && (
                      <p className="text-xs text-[#888780] mt-0.5">Ref: {item.productos.codigo} {item.productos.marca ? `(${item.productos.marca})` : ''}</p>
                    )}
                  </td>
                  <td className="py-3 text-right align-top">{item.cantidad}</td>
                  <td className="py-3 text-right align-top">{Number(item.precio_unitario).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                  <td className="py-3 text-right align-top">{Number(item.descuento_pct)}%</td>
                  <td className="py-3 text-right font-medium align-top">{Number(item.subtotal).toLocaleString('es-BO', { minimumFractionDigits: 2 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totales */}
        <div className="flex justify-end mb-12">
          <div className="w-80">
            <div className="flex justify-between py-2 border-b border-[#E5E7EB] text-sm">
              <span className="text-[#888780] font-medium">Subtotal Neto:</span>
              <span className="text-[#2C2C2A] font-medium">{Number(c.subtotal).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {c.moneda}</span>
            </div>
            {c.descuento_global > 0 && (
              <div className="flex justify-between py-2 border-b border-[#E5E7EB] text-sm text-[#A32D2D]">
                <span className="font-medium">Descuento Global ({c.descuento_global}%):</span>
                <span className="font-medium">-{Number(c.subtotal - c.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {c.moneda}</span>
              </div>
            )}
            <div className="flex justify-between py-4 text-xl">
              <span className="text-[#2C2C2A] font-bold">TOTAL FINAL:</span>
              <span className="text-[#0F6E56] font-bold">{Number(c.total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {c.moneda}</span>
            </div>
          </div>
        </div>

        {/* Condiciones */}
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <h4 className="font-bold text-[#2C2C2A] mb-2 uppercase text-[11px] tracking-wider">Condiciones Comerciales</h4>
            <p className="text-[#888780] whitespace-pre-line leading-relaxed">{c.condiciones || 'Ninguna'}</p>
          </div>
          <div className="flex flex-col justify-end items-center mt-12 pt-16">
            <div className="w-48 border-t border-[#888780] mb-2"></div>
            <p className="text-[#2C2C2A] font-medium text-xs uppercase tracking-wider">Firma Autorizada</p>
          </div>
        </div>

      </div>

    </div>
  )
}
