import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/ProtectedRoute'
import { alertSuccess, alertError, alertLoading, alertClose } from '../../../lib/alerts'
import { Loader2, ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react'
import ProveedorBuscador from '../../../components/ProveedorBuscador'

export default function OrdenCompraForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  
  const isEdit = !!id
  const [loading, setLoading] = useState(true)
  const [proveedores, setProveedores] = useState([])
  const [productos, setProductos] = useState([])
  
  // Si viene de SugerenciasPanel, preseleccionados es un array de IDs
  const preseleccionados = location.state?.preseleccionados || []

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      proveedor_id: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      fecha_esperada: '',
      moneda: 'USD',
      estado: 'BORRADOR',
      observaciones: '',
      detalles: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  const watchDetalles = watch('detalles')
  const watchProveedorId = watch('proveedor_id')
  const watchMoneda = watch('moneda')

  // Calcular totales
  const total = watchDetalles.reduce((sum, item) => sum + (parseFloat(item.cantidad || 0) * parseFloat(item.costo_unitario || 0)), 0)

  useEffect(() => {
    fetchInitialData()
  }, [])

  async function fetchInitialData() {
    setLoading(true)
    try {
      // 1. Cargar dependencias
      const [provRes, prodRes] = await Promise.all([
        supabase.from('proveedores').select('*').eq('activo', true).order('empresa'),
        supabase.from('productos').select('id, nombre, codigo, marca').eq('activo', true).order('nombre')
      ])

      if (provRes.error) throw provRes.error
      if (prodRes.error) throw prodRes.error

      setProveedores(provRes.data || [])
      setProductos(prodRes.data || [])

      // 2. Si es edición, cargar orden
      if (isEdit) {
        const { data: orden, error: ocErr } = await supabase
          .from('ordenes_compra')
          .select(`
            *,
            ordenes_compra_detalle (*)
          `)
          .eq('id', id)
          .single()

        if (ocErr) throw ocErr

        reset({
          proveedor_id: orden.proveedor_id || '',
          fecha_emision: orden.fecha_emision || '',
          fecha_esperada: orden.fecha_esperada || '',
          moneda: orden.moneda || 'USD',
          estado: orden.estado || 'BORRADOR',
          observaciones: orden.observaciones || '',
          detalles: orden.ordenes_compra_detalle.map(d => ({
            producto_id: d.producto_id,
            cantidad: d.cantidad,
            costo_unitario: d.costo_unitario
          }))
        })
      } else if (preseleccionados.length > 0) {
        // 3. Si viene de sugerencias, precargar productos
        // Idealmente también buscaríamos al proveedor preferido si todos son del mismo, 
        // pero por simplicidad solo agregamos los items.
        const defaultDetalles = preseleccionados.map(pid => ({
          producto_id: pid,
          cantidad: 1, // o podríamos buscar la cantidad sugerida
          costo_unitario: 0
        }))
        setValue('detalles', defaultDetalles)
      } else {
        // Agregar una fila vacía por defecto
        append({ producto_id: '', cantidad: 1, costo_unitario: 0 })
      }

    } catch (error) {
      console.error(error)
      alertError('Error al cargar', 'No se pudieron cargar los datos necesarios.')
    } finally {
      setLoading(false)
    }
  }

  const selectedProveedor = proveedores.find(p => p.id === watchProveedorId)

  async function generateNumeroOC() {
    const { count, error } = await supabase
      .from('ordenes_compra')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    const year = new Date().getFullYear()
    const nextNum = (count || 0) + 1
    return `OC-${year}-${String(nextNum).padStart(5, '0')}`
  }

  const onSubmit = async (data, forcedEstado = null) => {
    if (data.detalles.length === 0) {
      return alertError('Validación', 'Debes agregar al menos un producto a la orden.')
    }

    // Validar detalles
    for (const det of data.detalles) {
      if (!det.producto_id) return alertError('Validación', 'Todos los ítems deben tener un producto seleccionado.')
      if (parseFloat(det.cantidad) <= 0) return alertError('Validación', 'La cantidad debe ser mayor a 0.')
    }

    const estadoFinal = forcedEstado || data.estado

    alertLoading(isEdit ? 'Actualizando orden...' : 'Generando orden...', 'Calculando totales.')
    try {
      let ordenId = id

      if (isEdit) {
        // Update OC
        const { error: updErr } = await supabase.from('ordenes_compra').update({
          proveedor_id: data.proveedor_id,
          fecha_emision: data.fecha_emision,
          fecha_esperada: data.fecha_esperada || null,
          moneda: data.moneda,
          estado: estadoFinal,
          total: total,
          observaciones: data.observaciones
        }).eq('id', id)

        if (updErr) throw updErr

        // Update Detalle (borrar y recrear es más fácil)
        await supabase.from('ordenes_compra_detalle').delete().eq('orden_id', id)
      } else {
        // Create OC
        const numero = await generateNumeroOC()
        const { data: newOc, error: insErr } = await supabase.from('ordenes_compra').insert([{
          numero,
          proveedor_id: data.proveedor_id,
          fecha_emision: data.fecha_emision,
          fecha_esperada: data.fecha_esperada || null,
          moneda: data.moneda,
          estado: estadoFinal,
          total: total,
          observaciones: data.observaciones,
          created_by: user.id
        }]).select('id').single()

        if (insErr) throw insErr
        ordenId = newOc.id
      }

      // Insertar detalles
      const detallesPayload = data.detalles.map(d => ({
        orden_id: ordenId,
        producto_id: d.producto_id,
        cantidad: parseFloat(d.cantidad),
        costo_unitario: parseFloat(d.costo_unitario),
        subtotal: parseFloat(d.cantidad) * parseFloat(d.costo_unitario)
      }))

      const { error: detErr } = await supabase.from('ordenes_compra_detalle').insert(detallesPayload)
      if (detErr) throw detErr

      alertClose()
      alertSuccess(
        isEdit ? 'Orden actualizada' : 'Orden creada', 
        isEdit ? 'Los cambios se guardaron correctamente.' : `La orden ha sido generada con estado ${estadoFinal}.`
      )
      navigate('/compras')

    } catch (error) {
      console.error(error)
      alertClose()
      alertError('Error al guardar', error.message || 'Intenta nuevamente.')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-[#888780]" />
      </div>
    )
  }

  return (
    <div className="pb-24 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/compras')}
          className="p-2 rounded-lg hover:bg-[#E5E7EB] text-[#888780] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-medium text-[#2C2C2A]">
            {isEdit ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}
          </h1>
          <p className="text-sm text-[#888780] mt-0.5">Completa los datos para generar el documento</p>
        </div>
      </div>

      <form id="oc-form" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Columna Izquierda: Datos Generales */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
            <h2 className="text-base font-semibold text-[#2C2C2A] mb-4">Datos Generales</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Proveedor *</label>
                <ProveedorBuscador 
                  value={watchProveedorId}
                  onChange={(val) => setValue('proveedor_id', val, { shouldValidate: true })}
                  error={errors.proveedor_id}
                />
                <input type="hidden" {...register('proveedor_id', { required: 'Selecciona un proveedor' })} />

                {/* Proveedor Info Card */}
                {selectedProveedor && (
                  <div className="mt-3 p-3 bg-[#F9F9F7] rounded-lg border border-[#E5E7EB] text-xs">
                    <p className="text-[#888780] mb-1"><span className="font-medium text-[#2C2C2A]">Email:</span> {selectedProveedor.email || '—'}</p>
                    <p className="text-[#888780] mb-1"><span className="font-medium text-[#2C2C2A]">WhatsApp:</span> {selectedProveedor.whatsapp || '—'}</p>
                    <p className="text-[#888780]"><span className="font-medium text-[#2C2C2A]">Prefiere:</span> {selectedProveedor.canal_preferido || 'NO DEFINIDO'}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Emisión *</label>
                  <input
                    type="date"
                    {...register('fecha_emision', { required: true })}
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Esperada</label>
                  <input
                    type="date"
                    {...register('fecha_esperada')}
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
                    <option value="USD">USD ($)</option>
                    <option value="BOB">BOB (Bs)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Estado</label>
                  <select
                    {...register('estado')}
                    disabled={isEdit} // Para no cambiar estado libremente desde aquí si ya está avanzada
                    className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56] disabled:bg-[#F1EFE8]"
                  >
                    <option value="BORRADOR">Borrador</option>
                    <option value="ENVIADA">Enviada</option>
                    <option value="RECIBIDA">Recibida</option>
                    <option value="CANCELADA">Cancelada</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Observaciones</label>
                <textarea
                  {...register('observaciones')}
                  rows="3"
                  className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm outline-none focus:border-[#0F6E56] resize-none"
                  placeholder="Instrucciones para el proveedor..."
                />
              </div>

            </div>
          </div>
        </div>

        {/* Columna Derecha: Detalle Productos */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-[#2C2C2A]">Productos Solicitados</h2>
              <button
                type="button"
                onClick={() => append({ producto_id: '', cantidad: 1, costo_unitario: 0 })}
                className="flex items-center gap-1.5 text-sm font-medium text-[#0F6E56] hover:text-[#085041] px-3 py-1.5 rounded-lg hover:bg-[#F1F7F6] transition-colors"
              >
                <Plus size={16} /> Agregar fila
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-[#E5E7EB]">
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase">Producto</th>
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase w-24">Cantidad</th>
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase w-32">Costo U. ({watchMoneda})</th>
                    <th className="pb-2 text-[11px] font-medium text-[#888780] uppercase w-32 text-right">Subtotal</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {fields.map((field, index) => {
                    const cant = watchDetalles[index]?.cantidad || 0
                    const costo = watchDetalles[index]?.costo_unitario || 0
                    const subtotal = (parseFloat(cant) * parseFloat(costo)).toFixed(2)

                    return (
                      <tr key={field.id}>
                        <td className="py-3 pr-2">
                          <select
                            {...register(`detalles.${index}.producto_id`)}
                            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none focus:border-[#0F6E56]"
                          >
                            <option value="">Seleccione producto...</option>
                            {productos.map(p => (
                              <option key={p.id} value={p.id}>{p.codigo} - {p.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            {...register(`detalles.${index}.cantidad`)}
                            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none focus:border-[#0F6E56]"
                          />
                        </td>
                        <td className="py-3 pr-2">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            {...register(`detalles.${index}.costo_unitario`)}
                            className="w-full rounded-md border border-[#E5E7EB] px-2 py-1.5 text-sm outline-none focus:border-[#0F6E56]"
                          />
                        </td>
                        <td className="py-3 pr-2 text-right">
                          <span className="text-sm font-medium text-[#2C2C2A]">{subtotal}</span>
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="p-1.5 text-[#A32D2D] hover:bg-[#FCEBEB] rounded-md transition-colors"
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
                  No has agregado productos a la orden.
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-[#E5E7EB] flex justify-end">
              <div className="w-64">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-[#888780]">Subtotal:</span>
                  <span className="text-sm font-medium text-[#2C2C2A]">
                    {Number(total).toLocaleString('es-BO', { minimumFractionDigits: 2 })} {watchMoneda}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-[#E5E7EB]">
                  <span className="text-base font-semibold text-[#2C2C2A]">Total a Pagar:</span>
                  <span className="text-xl font-bold text-[#0F6E56]">
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
          onClick={() => navigate('/compras')}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-[#2C2C2A] bg-white border border-[#E5E7EB] hover:bg-[#F9F9F7] transition-colors"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={handleSubmit((data) => onSubmit(data, 'BORRADOR'))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-[#185FA5] bg-[#E6F1FB] hover:bg-[#D4E6F8] transition-colors"
        >
          <Save size={18} />
          Guardar Borrador
        </button>
        <button
          type="button"
          onClick={handleSubmit((data) => onSubmit(data, 'ENVIADA'))}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#0F6E56] hover:bg-[#085041] transition-colors shadow-sm"
        >
          <Send size={18} />
          Guardar y Enviar
        </button>
      </div>
    </div>
  )
}
