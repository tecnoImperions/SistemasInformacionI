import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../../lib/supabase'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { alertError } from '../../../lib/alerts'

export default function ManifiestoView() {
  const { id } = useParams()
  const [data, setData] = useState([])
  const [importacion, setImportacion] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    try {
      // Obtener el código de la importación (ya que la función rpc no lo devuelve directamente)
      const { data: imp, error: errImp } = await supabase
        .from('importaciones')
        .select('codigo, numero_contenedor, tipo_contenedor, proveedores(empresa, pais), estado, fecha_estimada_llegada')
        .eq('id', id)
        .single()
      
      if (errImp) throw errImp
      setImportacion(imp)

      // Ejecutar la función RPC para el manifiesto
      const { data: manifiesto, error: errRpc } = await supabase
        .rpc('fn_manifiesto_contenedor', { p_importacion_id: parseInt(id) })
      
      if (errRpc) throw errRpc
      setData(manifiesto || [])
    } catch (error) {
      console.error(error)
      alertError('Error al cargar manifiesto', 'No se pudieron cargar los datos para impresión.')
    } finally {
      setLoading(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 size={32} className="animate-spin text-[#0F6E56]" />
      </div>
    )
  }

  if (!importacion) {
    return (
      <div className="text-center py-12 text-[#888780]">
        Importación no encontrada.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl pb-12">
      {/* Estilos para impresión A4 limpio */}
      <style>
        {`
          @media print {
            aside, header { display: none !important; }
            main { padding: 0 !important; margin: 0 !important; }
            .print-hide { display: none !important; }
            @page { size: A4 portrait; margin: 15mm; }
            body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .print-container { box-shadow: none !important; border: none !important; }
          }
        `}
      </style>

      {/* Botones de acción (No se imprimen) */}
      <div className="print-hide mb-6 flex items-center justify-between">
        <Link
          to={`/importaciones/${id}`}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-[#e8e6df] bg-white text-[#2C2C2A] transition-colors hover:bg-[#F1EFE8]"
        >
          <ArrowLeft size={20} />
        </Link>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 rounded-lg bg-[#0F6E56] px-4 py-2 font-medium text-white transition-colors hover:bg-[#0b5a46]"
        >
          <Printer size={18} />
          Imprimir Manifiesto
        </button>
      </div>

      {/* Documento A4 */}
      <div className="print-container bg-white p-8 shadow-sm ring-1 ring-[#e8e6df] sm:p-12">
        {/* Encabezado del Manifiesto */}
        <div className="mb-8 border-b-2 border-[#0F6E56] pb-6 text-center">
          <h1 className="text-2xl font-bold uppercase tracking-wide text-[#2C2C2A]">
            Manifiesto de Carga
          </h1>
          <h2 className="mt-2 text-lg font-semibold text-[#0F6E56]">
            {importacion.codigo} {importacion.numero_contenedor ? `— ${importacion.numero_contenedor}` : ''}
          </h2>
        </div>

        {/* Resumen del Contenedor */}
        <div className="mb-8 grid grid-cols-2 gap-4 text-sm text-[#2C2C2A] sm:grid-cols-4">
          <div>
            <p className="font-semibold text-[#888780]">Tipo Contenedor</p>
            <p className="font-medium">{importacion.tipo_contenedor || '-'}</p>
          </div>
          <div>
            <p className="font-semibold text-[#888780]">Proveedor Origen</p>
            <p className="font-medium">{importacion.proveedores?.empresa}</p>
            <p className="text-xs text-[#888780]">{importacion.proveedores?.pais}</p>
          </div>
          <div>
            <p className="font-semibold text-[#888780]">Llegada Est.</p>
            <p className="font-medium">{importacion.fecha_estimada_llegada || '-'}</p>
          </div>
          <div>
            <p className="font-semibold text-[#888780]">Estado</p>
            <p className="font-medium uppercase">{importacion.estado.replace('_', ' ')}</p>
          </div>
        </div>

        {/* Detalle por Clientes */}
        <div className="mb-4">
          <h3 className="mb-4 text-base font-bold text-[#2C2C2A]">Detalle de Mercadería por Cliente</h3>
          
          <div className="overflow-hidden rounded-lg border border-[#e8e6df]">
            <table className="w-full text-left text-[13px] text-[#2C2C2A]">
              <thead className="bg-[#F1EFE8]/50 uppercase text-[#888780]">
                <tr>
                  <th className="border-b border-[#e8e6df] px-4 py-2 font-semibold">Cliente</th>
                  <th className="border-b border-[#e8e6df] px-4 py-2 font-semibold">Descripción</th>
                  <th className="border-b border-[#e8e6df] px-4 py-2 font-semibold">Bultos</th>
                  <th className="border-b border-[#e8e6df] px-4 py-2 font-semibold">Peso (kg)</th>
                  <th className="border-b border-[#e8e6df] px-4 py-2 font-semibold">Monto Ref.</th>
                  <th className="border-b border-[#e8e6df] px-4 py-2 font-semibold">Entrega</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6df]">
                {data.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-6 text-center text-[#888780]">
                      No hay cargas de clientes registradas para este manifiesto.
                    </td>
                  </tr>
                ) : (
                  data.map((fila, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3 align-top">
                        <div className="font-semibold text-[#0F6E56]">{fila.cliente_nombre}</div>
                        {fila.cliente_empresa && <div className="text-xs text-[#888780]">{fila.cliente_empresa}</div>}
                        {fila.cliente_telefono && <div className="text-xs text-[#888780]">{fila.cliente_telefono}</div>}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div>{fila.descripcion_carga}</div>
                        {fila.ref_cliente && (
                          <div className="text-xs text-[#888780]">Ref: {fila.ref_cliente}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">{fila.cantidad_bultos || '-'}</td>
                      <td className="px-4 py-3 align-top">
                        {fila.peso_kg ? `${fila.peso_kg} kg` : '-'}
                        {fila.volumen_m3 ? <div className="text-xs text-[#888780]">{fila.volumen_m3} m³</div> : null}
                      </td>
                      <td className="px-4 py-3 align-top font-medium">
                        {fila.monto_ref > 0 ? `${fila.monto_ref} ${fila.moneda}` : '-'}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span className="font-semibold uppercase text-[#2C2C2A]">
                          {fila.estado_entrega.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Firmas (solo visibles en impresión o como pie) */}
        <div className="mt-16 grid grid-cols-2 gap-12 text-center text-sm text-[#2C2C2A]">
          <div>
            <div className="mx-auto w-48 border-t border-[#888780] pt-2">
              Firma Responsable Almacén
            </div>
          </div>
          <div>
            <div className="mx-auto w-48 border-t border-[#888780] pt-2">
              Firma Conformidad
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
