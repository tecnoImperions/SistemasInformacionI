import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { supabase } from '../../../lib/supabase'
import { useAuth } from '../../../components/ProtectedRoute'
import { alertSuccess, alertError } from '../../../lib/alerts'
import { ArrowLeft, Save, Plus, Trash2, Loader2, Package, Truck, Check, ChevronRight, Anchor, FileText, AlertTriangle } from 'lucide-react'
import ProveedorBuscador from '../../../components/ProveedorBuscador'
import ProductoBuscador from '../../../components/ProductoBuscador'

const TIPOS_CONTENEDOR = ['20FT', '40FT', '40HC', 'LCL', 'OTRO']
const ESTADOS = [
  { id: 'EN_ORIGEN', label: 'En Origen' },
  { id: 'EN_TRANSITO', label: 'En Tránsito' },
  { id: 'ADUANA', label: 'En Aduana' },
  { id: 'RECIBIDO', label: 'Recibido en Almacén' }
]

export default function ImportacionForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const isEdit = !!id
  const [currentStep, setCurrentStep] = useState(1)

  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(isEdit)
  const [almacenes, setAlmacenes] = useState([])
  
  const { register, control, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      proveedor_id: '',
      numero_contenedor: '',
      tipo_contenedor: '20FT',
      naviera: '',
      puerto_origen: '',
      puerto_destino: 'Puerto Suárez - Bolivia',
      ciudad_destino: 'Santa Cruz de la Sierra',
      referencia_bl: '',
      fecha_pedido: new Date().toISOString().split('T')[0],
      fecha_estimada_llegada: '',
      almacen_destino_id: '1',
      estado: 'EN_ORIGEN',
      moneda: 'USD',
      costo_total_ref: 0,
      costo_flete: 0,
      costo_aduana: 0,
      costo_otros: 0,
      observaciones: '',
      detalles: []
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'detalles'
  })

  const watchAll = watch()

  useEffect(() => {
    loadDependencies()
    if (isEdit) {
      loadImportacion()
    }
  }, [id])

  async function loadDependencies() {
    try {
      const { data } = await supabase.from('almacenes').select('id, nombre').is('deleted_at', null)
      if (data) setAlmacenes(data)
    } catch (error) {
      alertError('Error', 'No se pudieron cargar los almacenes.')
    }
  }

  async function loadImportacion() {
    try {
      const { data: imp, error } = await supabase
        .from('importaciones')
        .select(`
          *,
          importaciones_detalle (
            id, producto_id, cantidad_pedida, cantidad_recibida, costo_unitario,
            productos(nombre, codigo_interno)
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      if (imp) {
        reset({
          ...imp,
          fecha_estimada_llegada: imp.fecha_estimada_llegada || '',
          detalles: imp.importaciones_detalle.map(d => ({
            producto_id: d.producto_id,
            nombre: d.productos?.nombre,
            codigo_interno: d.productos?.codigo_interno,
            cantidad_pedida: d.cantidad_pedida,
            cantidad_recibida: d.cantidad_recibida || 0,
            costo_unitario: d.costo_unitario || 0
          }))
        })
      }
    } catch (error) {
      alertError('Error', 'No se pudo cargar la importación.')
    } finally {
      setInitialLoading(false)
    }
  }

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (!watchAll.proveedor_id) return alertError('Validación', 'El proveedor es obligatorio.')
      if (!watchAll.numero_contenedor) return alertError('Validación', 'El número de contenedor es obligatorio.')
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (watchAll.detalles.length === 0) return alertError('Validación', 'Debes agregar al menos un producto a la importación.')
      // Validar cantidades
      for (const det of watchAll.detalles) {
        if (!det.cantidad_pedida || det.cantidad_pedida <= 0) return alertError('Validación', 'Todas las cantidades pedidas deben ser mayores a cero.')
      }
      setCurrentStep(3)
    }
  }

  const handlePrevStep = () => {
    setCurrentStep(prev => Math.max(1, prev - 1))
  }

  const handleSelectProduct = (prod) => {
    const exists = watchAll.detalles.findIndex(d => d.producto_id === prod.id)
    if (exists >= 0) {
      alertError('Producto repetido', 'El producto ya está en la lista.')
      return
    }
    append({
      producto_id: prod.id,
      nombre: prod.nombre,
      codigo_interno: prod.codigo_interno,
      cantidad_pedida: 1,
      cantidad_recibida: 0,
      costo_unitario: prod.precio_costo_ref || 0
    })
  }

  async function generateCodigo() {
    const { count, error } = await supabase.from('importaciones').select('*', { count: 'exact', head: true })
    if (error) throw error
    const year = new Date().getFullYear()
    const nextNum = (count || 0) + 1
    return `IMP-${year}-${String(nextNum).padStart(5, '0')}`
  }

  const getTotalProductos = () => {
    return watchAll.detalles.reduce((acc, curr) => acc + (parseFloat(curr.cantidad_pedida || 0) * parseFloat(curr.costo_unitario || 0)), 0)
  }

  async function onSubmit(data) {
    setLoading(true)
    try {
      const payload = {
        proveedor_id: data.proveedor_id,
        numero_contenedor: data.numero_contenedor,
        tipo_contenedor: data.tipo_contenedor,
        naviera: data.naviera,
        puerto_origen: data.puerto_origen,
        puerto_destino: data.puerto_destino,
        ciudad_destino: data.ciudad_destino,
        referencia_bl: data.referencia_bl,
        fecha_pedido: data.fecha_pedido,
        fecha_estimada_llegada: data.fecha_estimada_llegada || null,
        almacen_destino_id: data.almacen_destino_id,
        estado: data.estado,
        moneda: data.moneda,
        costo_total_ref: data.costo_total_ref || 0,
        costo_flete: data.costo_flete || 0,
        costo_aduana: data.costo_aduana || 0,
        costo_otros: data.costo_otros || 0,
        observaciones: data.observaciones
      }

      let importacionId = id

      if (isEdit) {
        const { error: updErr } = await supabase.from('importaciones').update(payload).eq('id', id)
        if (updErr) throw updErr

        await supabase.from('importaciones_detalle').delete().eq('importacion_id', id)
        
        if (data.detalles.length > 0) {
          const detallesPayload = data.detalles.map(d => ({
            importacion_id: id,
            producto_id: d.producto_id,
            cantidad_pedida: d.cantidad_pedida,
            cantidad_recibida: d.cantidad_recibida || 0,
            costo_unitario: d.costo_unitario || 0
          }))
          const { error: detErr } = await supabase.from('importaciones_detalle').insert(detallesPayload)
          if (detErr) throw detErr
        }
        alertSuccess('Actualizado', 'Importación actualizada correctamente.')
      } else {
        payload.codigo = await generateCodigo()
        payload.created_by = user.id
        
        const { data: newImp, error: insErr } = await supabase.from('importaciones').insert([payload]).select().single()
        if (insErr) throw insErr
        importacionId = newImp.id

        if (data.detalles.length > 0) {
          const detallesPayload = data.detalles.map(d => ({
            importacion_id: importacionId,
            producto_id: d.producto_id,
            cantidad_pedida: d.cantidad_pedida,
            cantidad_recibida: 0,
            costo_unitario: d.costo_unitario || 0
          }))
          await supabase.from('importaciones_detalle').insert(detallesPayload)
        }
        alertSuccess('Creado', 'Importación registrada correctamente.')
      }
      navigate(`/importaciones`)
    } catch (error) {
      console.error(error)
      alertError('Error', 'No se pudo guardar la importación.')
    } finally {
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0F6E56]" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto pb-24">
      {/* Header y Stepper Info */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/importaciones')}
          className="p-2 rounded-lg hover:bg-[#E5E7EB] text-[#888780] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-[#2C2C2A] m-0">
            {isEdit ? 'Editar Importación' : 'Nueva Importación'}
          </h1>
          <p className="text-sm text-[#888780] m-0 mt-1">Completa los 3 pasos para registrar el contenedor.</p>
        </div>
      </div>

      {/* Stepper Visual */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 w-full h-[2px] bg-[#E5E7EB] -z-10 transform -translate-y-1/2" />
        <div className="absolute left-0 top-1/2 h-[2px] bg-[#0F6E56] -z-10 transform -translate-y-1/2 transition-all duration-300" style={{ width: `${((currentStep - 1) / 2) * 100}%` }} />
        
        {[
          { step: 1, label: 'Datos del Contenedor', icon: Truck },
          { step: 2, label: 'Productos', icon: Package },
          { step: 3, label: 'Revisión', icon: Check }
        ].map((s) => (
          <div key={s.step} className="flex flex-col items-center gap-2 bg-[#F1EFE8] px-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-medium border-2 transition-all duration-300 ${currentStep === s.step ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : currentStep > s.step ? 'bg-white text-[#0F6E56] border-[#0F6E56]' : 'bg-white text-[#D1CFC8] border-[#E5E7EB]'}`}>
              {currentStep > s.step ? <Check size={18} /> : <s.icon size={18} />}
            </div>
            <span className={`text-xs font-medium ${currentStep >= s.step ? 'text-[#2C2C2A]' : 'text-[#D1CFC8]'}`}>{s.label}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ================= PASO 1 ================= */}
        <div className={`${currentStep === 1 ? 'block' : 'hidden'}`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Columna Izquierda */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <h2 className="text-sm font-semibold text-[#2C2C2A] mb-4 flex items-center gap-2 border-b border-[#F1EFE8] pb-2">
                  <Truck size={16} color="#0F6E56" /> Origen y Proveedor
                </h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Proveedor Internacional *</label>
                    <ProveedorBuscador 
                      value={watchAll.proveedor_id} 
                      onChange={(id) => setValue('proveedor_id', id, { shouldValidate: true })} 
                      error={errors.proveedor_id} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Fecha de Pedido *</label>
                      <input type="date" {...register('fecha_pedido', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Llegada Estimada</label>
                      <input type="date" {...register('fecha_estimada_llegada')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Estado del Trámite</label>
                    <div className="flex flex-wrap gap-2">
                      {ESTADOS.map(est => (
                        <button
                          key={est.id} type="button"
                          onClick={() => setValue('estado', est.id)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border ${watchAll.estado === est.id ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : 'bg-white text-[#5C5B57] border-[#E5E7EB] hover:bg-[#F9F9F7]'}`}
                        >
                          {est.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <h2 className="text-sm font-semibold text-[#2C2C2A] mb-4 flex items-center gap-2 border-b border-[#F1EFE8] pb-2">
                  <FileText size={16} color="#0F6E56" /> Costos y Moneda
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Moneda Principal</label>
                    <div className="flex">
                      {['USD', 'BOB'].map(m => (
                        <button key={m} type="button" onClick={() => setValue('moneda', m)} className={`flex-1 py-2 text-sm border border-[#E5E7EB] ${watchAll.moneda === m ? 'bg-[#2C2C2A] text-white border-[#2C2C2A] font-medium' : 'bg-white text-[#5C5B57]'} first:rounded-l-lg last:rounded-r-lg`}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Costo Total Ref. (FOB/CIF)</label>
                      <input type="number" step="0.01" {...register('costo_total_ref')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Costo Flete</label>
                      <input type="number" step="0.01" {...register('costo_flete')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Costo Aduana</label>
                      <input type="number" step="0.01" {...register('costo_aduana')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Otros Costos</label>
                      <input type="number" step="0.01" {...register('costo_otros')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" placeholder="0.00" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
                <h2 className="text-sm font-semibold text-[#2C2C2A] mb-4 flex items-center gap-2 border-b border-[#F1EFE8] pb-2">
                  <Anchor size={16} color="#0F6E56" /> Logística y Destino
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Tipo de Contenedor</label>
                    <div className="flex flex-wrap gap-2">
                      {TIPOS_CONTENEDOR.map(tc => (
                        <button
                          key={tc} type="button"
                          onClick={() => setValue('tipo_contenedor', tc)}
                          className={`px-3 py-1.5 rounded-md text-xs font-medium border ${watchAll.tipo_contenedor === tc ? 'bg-[#0F6E56] text-white border-[#0F6E56]' : 'bg-white text-[#5C5B57] border-[#E5E7EB] hover:bg-[#F9F9F7]'}`}
                        >
                          {tc}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Número de Contenedor *</label>
                    <input type="text" {...register('numero_contenedor', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56] font-mono uppercase" placeholder="Ej: MSCU1234567" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Naviera</label>
                      <input type="text" {...register('naviera')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" placeholder="Ej: MSC" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Referencia BL</label>
                      <input type="text" {...register('referencia_bl')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" placeholder="Bill of Lading" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Puerto Origen</label>
                      <input type="text" {...register('puerto_origen')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" placeholder="Ej: Shanghai" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Puerto Destino</label>
                      <input type="text" {...register('puerto_destino')} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]" />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-[#2C2C2A] mb-1">Almacén Físico de Destino *</label>
                    <select {...register('almacen_destino_id', { required: true })} className="w-full border border-[#E5E7EB] rounded-lg p-2.5 text-sm outline-none focus:border-[#0F6E56]">
                      {almacenes.map(a => (
                        <option key={a.id} value={a.id}>{a.nombre}</option>
                      ))}
                    </select>
                    <p className="text-[11px] text-[#888780] mt-1">El stock se sumará a este almacén cuando la importación cambie a "Recibido en Almacén".</p>
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* ================= PASO 2 ================= */}
        <div className={`${currentStep === 2 ? 'block' : 'hidden'}`}>
          <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm">
            <h2 className="text-base font-semibold text-[#2C2C2A] mb-4 flex items-center gap-2 border-b border-[#F1EFE8] pb-4">
              <Package size={18} color="#0F6E56" /> Productos en el Contenedor
            </h2>
            
            <div className="mb-6 max-w-md">
              <label className="block text-sm font-medium text-[#2C2C2A] mb-2">Agregar Producto</label>
              <ProductoBuscador onSelect={handleSelectProduct} />
            </div>

            {fields.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#E5E7EB]">
                      <th className="py-3 px-4 font-medium text-[#888780] w-[40%]">Producto</th>
                      <th className="py-3 px-4 font-medium text-[#888780] w-[20%] text-right">Cant. Pedida</th>
                      {watchAll.estado === 'RECIBIDO' && (
                        <th className="py-3 px-4 font-medium text-[#0F6E56] w-[15%] text-right">Cant. Recibida</th>
                      )}
                      <th className="py-3 px-4 font-medium text-[#888780] w-[15%] text-right">Costo Unit.</th>
                      <th className="py-3 px-4 font-medium text-[#888780] w-[10%] text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F1EFE8]">
                    {fields.map((field, index) => (
                      <tr key={field.id} className="hover:bg-[#F9F9F7] transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-medium text-[#2C2C2A]">{field.nombre}</p>
                          <p className="text-xs text-[#888780]">{field.codigo_interno}</p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <input 
                            type="number" {...register(`detalles.${index}.cantidad_pedida`)} 
                            className="w-24 border border-[#E5E7EB] rounded-md px-2 py-1 text-right text-sm outline-none focus:border-[#0F6E56]" 
                          />
                        </td>
                        {watchAll.estado === 'RECIBIDO' && (
                          <td className="py-3 px-4 text-right">
                            <input 
                              type="number" {...register(`detalles.${index}.cantidad_recibida`)} 
                              className="w-24 border border-[#0F6E56] rounded-md px-2 py-1 text-right text-sm outline-none bg-[#E1F5EE]" 
                            />
                          </td>
                        )}
                        <td className="py-3 px-4 text-right">
                          <input 
                            type="number" step="0.01" {...register(`detalles.${index}.costo_unitario`)} 
                            className="w-24 border border-[#E5E7EB] rounded-md px-2 py-1 text-right text-sm outline-none focus:border-[#0F6E56]" 
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button type="button" onClick={() => remove(index)} className="text-[#EF4444] hover:bg-[#FEE2E2] p-1.5 rounded-md transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 flex justify-end">
                  <div className="bg-[#F9F9F7] p-4 rounded-lg border border-[#E5E7EB] min-w-[250px]">
                    <div className="flex justify-between text-sm mb-2 text-[#888780]">
                      <span>Total Productos:</span>
                      <span className="font-medium text-[#2C2C2A]">{getTotalProductos().toLocaleString()} {watchAll.moneda}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-[#F9F9F7] rounded-lg border border-dashed border-[#D1CFC8]">
                <Package size={32} color="#D1CFC8" className="mx-auto mb-3" />
                <p className="text-[#888780] text-sm">Aún no has agregado productos al contenedor.</p>
                <p className="text-[#888780] text-xs">Usa el buscador de arriba para agregarlos.</p>
              </div>
            )}
          </div>
        </div>

        {/* ================= PASO 3 ================= */}
        <div className={`${currentStep === 3 ? 'block' : 'hidden'}`}>
          <div className="max-w-2xl mx-auto space-y-6">
            
            {watchAll.estado === 'RECIBIDO' && (
              <div className="bg-[#FEF3C7] border-l-4 border-[#F59E0B] p-4 rounded-r-lg flex items-start gap-3">
                <AlertTriangle color="#D97706" size={24} className="mt-0.5" />
                <div>
                  <h3 className="text-[#92400E] font-medium text-sm">Ingreso a Inventario Automático</h3>
                  <p className="text-[#92400E] text-xs mt-1">Has marcado esta importación como <b>"Recibido en Almacén"</b>. Al guardar, las cantidades registradas se sumarán automáticamente al inventario del almacén seleccionado. Esta acción generará movimientos de entrada.</p>
                </div>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl border border-[#E5E7EB] shadow-sm text-sm">
              <h2 className="text-lg font-semibold text-[#2C2C2A] mb-4 text-center">Revisión Final</h2>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6 border-b border-[#F1EFE8] pb-6">
                <div>
                  <span className="block text-[#888780] text-xs mb-1">Contenedor</span>
                  <span className="font-mono font-medium text-[#2C2C2A]">{watchAll.numero_contenedor} ({watchAll.tipo_contenedor})</span>
                </div>
                <div>
                  <span className="block text-[#888780] text-xs mb-1">Estado</span>
                  <span className="font-medium text-[#0F6E56]">{ESTADOS.find(e => e.id === watchAll.estado)?.label}</span>
                </div>
                <div>
                  <span className="block text-[#888780] text-xs mb-1">Ruta</span>
                  <span className="text-[#2C2C2A]">{watchAll.puerto_origen || '?'} → {watchAll.ciudad_destino}</span>
                </div>
                <div>
                  <span className="block text-[#888780] text-xs mb-1">Destino Físico (Almacén)</span>
                  <span className="text-[#2C2C2A] font-medium">{almacenes.find(a => a.id == watchAll.almacen_destino_id)?.nombre}</span>
                </div>
              </div>

              <div className="mb-6">
                <span className="block text-[#888780] text-xs mb-2">Resumen de Productos</span>
                <div className="bg-[#F9F9F7] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[#2C2C2A]">Total Ítems:</span>
                    <span className="font-medium">{fields.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[#2C2C2A]">Valor Total Ref:</span>
                    <span className="font-medium">{getTotalProductos().toLocaleString()} {watchAll.moneda}</span>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="mt-8 flex justify-between items-center border-t border-[#E5E7EB] pt-6">
          {currentStep > 1 ? (
            <button type="button" onClick={handlePrevStep} className="px-5 py-2.5 rounded-lg border border-[#E5E7EB] text-[#2C2C2A] font-medium hover:bg-[#F9F9F7] transition-colors flex items-center gap-2">
              <ArrowLeft size={16} /> Atrás
            </button>
          ) : <div />}

          {currentStep < 3 ? (
            <button type="button" onClick={handleNextStep} className="px-5 py-2.5 rounded-lg bg-[#2C2C2A] text-white font-medium hover:bg-black transition-colors flex items-center gap-2">
              Siguiente <ChevronRight size={16} />
            </button>
          ) : (
            <button type="submit" disabled={loading} className="px-6 py-2.5 rounded-lg bg-[#0F6E56] text-white font-medium hover:bg-[#0C5844] transition-colors flex items-center gap-2 shadow-sm">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Guardar Importación
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
