import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/ProtectedRoute'
import { alertSuccess, alertError, alertLoading, alertClose } from '../../../lib/alerts'
import { Loader2, ArrowLeft, Plus, Trash2, Save, FileText } from 'lucide-react'

export default function CotizacionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const isEdit = !!id
  const [loading, setLoading] = useState(true)
  const [clientes, setClientes] = useState([])
  const [productos, setProductos] = useState([])

  const getTomorrowPlus15 = () => {
    const d = new Date()
    d.setDate(d.getDate() + 15)
    return d.toISOString().split('T')[0]
  }

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm({
    defaultValues: {
      cliente_id: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_validez: getTomorrowPlus15(),
      moneda: 'BOB',
      estado: 'BORRADOR',
      descuento_global: 0,
      condiciones: 'Precios válidos por 15 días, sujeto a disponibilidad de stock.',
      observaciones: '',
      detalles: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  const watchDetalles = watch('detalles')
  const watchClienteId = watch('cliente_id')
  const watchMoneda = watch('moneda')
  const watchDescuentoGlobal = watch('descuento_global')

  // Calcular totales
  const subtotalNeto = watchDetalles.reduce((sum, item) => {
    const cant = parseFloat(item.cantidad || 0)
    const precio = parseFloat(item.precio_unitario || 0)
    const descPct = parseFloat(item.descuento_pct || 0)
    return sum + (cant * precio * (1 - descPct / 100))
  }, 0)
  
  const montoDescuentoGlobal = subtotalNeto * (parseFloat(watchDescuentoGlobal || 0) / 100)
  const total = subtotalNeto - montoDescuentoGlobal

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      const [cliRes, prodRes] = await Promise.all([
        supabase.from('clientes').select('*').eq('activo', true).order('nombre'),
        supabase.from('productos').select('id, nombre, codigo, marca, precio_venta_ref').eq('activo', true).order('nombre')
      ])

      if (cliRes.error) throw cliRes.error
      if (prodRes.error) throw prodRes.error

      setClientes(cliRes.data || [])
      setProductos(prodRes.data || [])

      if (isEdit) {
        const { data: cot, error: cotErr } = await supabase
          .from('cotizaciones')
          .select(`
            *,
            cotizaciones_detalle (*)
          `)
          .eq('id', id)
          .single()

        if (cotErr) throw cotErr

        reset({
          cliente_id: cot.cliente_id || '',
          fecha_emision: cot.fecha_emision || '',
          fecha_validez: cot.fecha_validez || '',
          moneda: cot.moneda || 'BOB',
          estado: cot.estado || 'BORRADOR',
          descuento_global: cot.descuento_global || 0,
          condiciones: cot.condiciones || '',
          observaciones: cot.observaciones || '',
          detalles: cot.cotizaciones_detalle.map(d => ({
            producto_id: d.producto_id,
            descripcion: d.descripcion,
            cantidad: d.cantidad,
            precio_unitario: d.precio_unitario,
            descuento_pct: d.descuento_pct || 0
          }))
        })
      } else {
        append({ producto_id: '', descripcion: '', cantidad: 1, precio_unitario: 0, descuento_pct: 0 })
      }
    } catch (error) {
      console.error(error)
      alertError('Error al cargar', 'No se pudieron cargar los datos necesarios.')
    } finally {
      setLoading(false)
    }
  }

  const selectedCliente = clientes.find(c => c.id === watchClienteId)

  async function generateNumero() {
    const { count, error } = await supabase.from('cotizaciones').select('*', { count: 'exact', head: true })
    if (error) throw error
    const year = new Date().getFullYear()
    const nextNum = (count || 0) + 1
    return `COT-${year}-${String(nextNum).padStart(5, '0')}`
  }

  const onSubmit = async (data, actionType) => {
    if (data.detalles.length === 0) {
      return alertError('Validación', 'Debes agregar al menos un producto.')
    }

    for (const det of data.detalles) {
      if (!det.producto_id && !det.descripcion) return alertError('Validación', 'Todas las filas deben tener producto o descripción.')
      if (parseFloat(det.cantidad) <= 0) return alertError('Validación', 'La cantidad debe ser mayor a 0.')
    }

    alertLoading(isEdit ? 'Actualizando cotización...' : 'Generando cotización...', 'Calculando.')
    try {
      let cotId = id

      const cabecera = {
        cliente_id: data.cliente_id,
        fecha_emision: data.fecha_emision,
        fecha_validez: data.fecha_validez,
        moneda: data.moneda,
        estado: data.estado,
        subtotal: subtotalNeto,
        descuento_global: parseFloat(data.descuento_global || 0),
        total: total,
        condiciones: data.condiciones,
        observaciones: data.observaciones
      }

      if (isEdit) {
        const { error: updErr } = await supabase.from('cotizaciones').update(cabecera).eq('id', id)
        if (updErr) throw updErr
        await supabase.from('cotizaciones_detalle').delete().eq('cotizacion_id', id)
      } else {
        const numero = await generateNumero()
        cabecera.numero = numero
        cabecera.created_by = user.id

        const { data: newCot, error: insErr } = await supabase.from('cotizaciones').insert([cabecera]).select('id').single()
        if (insErr) throw insErr
        cotId = newCot.id
      }

      const detallesPayload = data.detalles.map(d => {
        const cant = parseFloat(d.cantidad)
        const precio = parseFloat(d.precio_unitario)
        const desc = parseFloat(d.descuento_pct || 0)
        return {
          cotizacion_id: cotId,
          producto_id: d.producto_id || null,
          descripcion: d.descripcion || '',
          cantidad: cant,
          precio_unitario: precio,
          descuento_pct: desc,
          subtotal: cant * precio * (1 - desc / 100)
        }
      })

      const { error: detErr } = await supabase.from('cotizaciones_detalle').insert(detallesPayload)
      if (detErr) throw detErr

      alertClose()
      alertSuccess('Guardado', 'La cotización se ha guardado correctamente.')

      if (actionType === 'PREVIEW') {
        navigate(`/cotizaciones/${cotId}/preview`)
      } else {
        navigate('/cotizaciones')
      }

    } catch (error) {
      console.error(error)
      alertClose()
      alertError('Error al guardar', error.message || 'Intenta nuevamente.')
    }
  }

  // Cuando cambia el producto seleccionado en una fila, autocompletar precio_unitario y descripcion
  const handleProductChange = (index, prodId) => {
    const prod = productos.find(p => p.id === prodId)
    if (prod) {
       // Acceder de forma más directa en vez de usar setValue si queremos reactividad
       // react-hook-form usa setValue para actualizar fields
       const { setValue } = (function(){return{setValue:arguments[1]}})(null, function(){return arguments[1]}) // hacky? mejor usar el scope.
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#888780]" />
      </div>
    )
  }

  return (
    <div className="pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/cotizaciones')}
          className="p-2 rounded-lg hover:bg-[#E5E7EB] text-[#888780] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-medium text-[#2C2C2A]">
            {isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
          </h1>
          <p className="text-sm text-[#888780] mt-0.5">Propuesta comercial para el cliente</p>
        </div>
      </div>

      <form id="cot-form" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Datos Generales */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#2C2C2A] mb-4">Datos Generales</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Cliente *</label>
                <select
                  {...register('cliente_id', { required: 'Selecciona un cliente' })}
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56]"
                >
                  <option value="">Seleccione...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.empresa ? `(${c.empresa})` : ''}</option>
                  ))}
                </select>
                {errors.cliente_id && <p className="text-xs text-red-500 mt-1">{errors.cliente_id.message}</p>}

                {selectedCliente && (
                  <div className="mt-3 p-3 bg-[#F9F9F7] rounded-lg border border-[#E5E7EB] text-xs">
                    <p className="text-[#888780] mb-1"><span className="font-medium text-[#2C2C2A]">Teléfono:</span> {selectedCliente.telefono || '—'}</p>
                    <p className="text-[#888780]"><span className="font-medium text-[#2C2C2A]">Email:</span> {selectedCliente.email || '—'}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Emisión</label>
                  <input
                    type="date"
                    {...register('fecha_emision', { required: true })}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Validez</label>
                  <input
                    type="date"
                    {...register('fecha_validez')}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Moneda</label>
                  <select
                    {...register('moneda')}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56]"
                  >
                    <option value="BOB">BOB (Bs)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Estado</label>
                  <select
                    {...register('estado')}
                    disabled={isEdit}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56] disabled:bg-[#F1EFE8]"
                  >
                    <option value="BORRADOR">Borrador</option>
                    <option value="ENVIADA">Enviada</option>
                    <option value="APROBADA">Aprobada</option>
                    <option value="RECHAZADA">Rechazada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Condiciones Comerciales</label>
                <textarea
                  {...register('condiciones')}
                  rows="3"
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56] resize-none"
                  placeholder="Ej: Precios válidos por 15 días..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Observaciones Internas</label>
                <textarea
                  {...register('observaciones')}
                  rows="2"
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56] resize-none"
                  placeholder="Solo visible internamente..."
                />
              </div>

            </div>
          </div>
        </div>

        {/* Columna Derecha: Detalle Productos */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#2C2C2A]">Productos a Cotizar</h2>
              <button
                type="button"
                onClick={() => append({ producto_id: '', descripcion: '', cantidad: 1, precio_unitario: 0, descuento_pct: 0 })}
                className="flex items-center gap-1.5 text-sm font-medium text-[#0F6E56] hover:text-[#085041] px-3 py-1.5 rounded-lg hover:bg-[#F1F7F6] transition-colors"
              >
                <Plus size={16} /> Agregar fila
              </button>
            </div>

            <div className="overflow-x-auto pb-4">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase w-1/3">Producto / Ref</th>
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase">Descripción</th>
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase w-20">Cant</th>
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase w-24">Precio U.</th>
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase w-20">% Desc</th>
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase w-24 text-right">Subtotal</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {fields.map((field, index) => {
                    const cant = parseFloat(watchDetalles[index]?.cantidad || 0)
                    const precio = parseFloat(watchDetalles[index]?.precio_unitario || 0)
                    const desc = parseFloat(watchDetalles[index]?.descuento_pct || 0)
                    const subtotalItem = (cant * precio * (1 - desc / 100)).toFixed(2)

                    return (
                      <tr key={field.id}>
                        <td className="py-3 pr-2">
                          <select
                            {...register(`detalles.${index}.producto_id`)}
                            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[13px] outline-none focus:border-[#0F6E56]"
                            onChange={(e) => {
                              const pId = e.target.value
                              if (pId) {
                                const prod = productos.find(p => p.id === pId)
                                if (prod) {
                                  // Hack para actualizar sin destructurar setValue de form
                                  document.querySelector(`input[name="detalles.${index}.descripcion"]`).value = `${prod.nombre} ${prod.marca ? `(${prod.marca})` : ''}`
                                  document.querySelector(`input[name="detalles.${index}.precio_unitario"]`).value = prod.precio_venta_ref || 0
                                  // Disparar eventos
                                  document.querySelector(`input[name="detalles.${index}.descripcion"]`).dispatchEvent(new Event('input', { bubbles: true }))
                                  document.querySelector(`input[name="detalles.${index}.precio_unitario"]`).dispatchEvent(new Event('input', { bubbles: true }))
                                }
                              }
                            }}
                          >
                            <option value="">Libre...</option>
                            {productos.map(p => (
                              <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="text"
                            {...register(`detalles.${index}.descripcion`)}
                            placeholder="Desc manual..."
                            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[13px] outline-none focus:border-[#0F6E56]"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            {...register(`detalles.${index}.cantidad`)}
                            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[13px] outline-none focus:border-[#0F6E56]"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`detalles.${index}.precio_unitario`)}
                            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[13px] outline-none focus:border-[#0F6E56]"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            {...register(`detalles.${index}.descuento_pct`)}
                            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-[13px] outline-none focus:border-[#0F6E56]"
                          />
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <span className="text-sm font-medium text-[#2C2C2A]">{subtotalItem}</span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1 text-[#A32D2D] hover:bg-[#FCEBEB] rounded-md transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {fields.length === 0 && (
                <div className="py-8 text-center text-sm text-[#888780]">
                  No has agregado productos a la cotización.
                </div>
              )}
            </div>

            {/* Totales */}
            <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex justify-end">
              <div className="w-72">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#888780]">Subtotal Bruto:</span>
                  <span className="text-sm font-medium text-[#2C2C2A]">
                    {Number(subtotalNeto).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {watchMoneda}
                  </span>
                </div>
                
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm text-[#888780]">Descuento Global (%):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...register('descuento_global')}
                      className="w-16 rounded-md border border-[#E5E7EB] px-2 py-1 text-sm outline-none focus:border-[#0F6E56] text-right"
                    />
                    <span className="text-sm font-medium text-[#A32D2D]">
                      -{Number(montoDescuentoGlobal).toLocaleString('es-BO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-[#E5E7EB]">
                  <span className="text-base font-semibold text-[#2C2C2A]">TOTAL FINAL:</span>
                  <span className="text-2xl font-bold text-[#0F6E56]">
                    {Number(total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {watchMoneda}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </form>

      {/* Footer Fixed Actions */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-white border-t border-[#E5E7EB] p-4 flex items-center justify-end gap-3 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          type="button"
          onClick={() => navigate('/cotizaciones')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#2C2C2A] bg-white border border-[#E5E7EB] hover:bg-[#F9F9F7] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit((data) => onSubmit(data, 'SAVE'))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[#185FA5] bg-[#E6F1FB] hover:bg-[#D4E6F8] transition-colors"
        >
          <Save size={18} />
          Guardar Borrador
        </button>
        <button
          type="button"
          onClick={handleSubmit((data) => onSubmit(data, 'PREVIEW'))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#0F6E56] hover:bg-[#085041] transition-colors shadow-sm"
        >
          <FileText size={18} />
          Guardar y Previsualizar
        </button>
      </div>
    </div>
  )
}
